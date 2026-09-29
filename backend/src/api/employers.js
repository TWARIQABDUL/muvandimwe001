import express from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/init.js';
import { authMiddleware, roleMiddleware, gymIsolationMiddleware } from '../middleware/auth.js';

const router = express.Router();
const db = getDatabase();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/\.(xlsx|xls)$/i.test(file.originalname)) {
      return cb(new Error('Only .xlsx or .xls files are supported'));
    }
    cb(null, true);
  }
});

// Cell values from exceljs can be plain, rich text, or formula results
function cellToString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (value.richText) return value.richText.map((r) => r.text).join('');
    if (value.text !== undefined) return String(value.text);
    if (value.result !== undefined) return String(value.result);
    return '';
  }
  return String(value);
}

// Finds the "Institution" / "Services" header row and reads every row below it,
// wherever it happens to sit (this file has a title + blank rows before the header).
function parseInstitutionsWorksheet(worksheet) {
  const rows = [];
  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const cells = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cells[colNumber] = cellToString(cell.value);
    });
    rows.push({ rowNumber, cells });
  });

  let nameCol = -1;
  let servicesCol = -1;
  let headerRowNumber = -1;

  for (const { rowNumber, cells } of rows) {
    for (let c = 1; c < cells.length; c++) {
      const text = (cells[c] || '').trim().toUpperCase();
      if (text.includes('INSTITUTION') || text.includes('ORGANIZATION') || text.includes('ORGANISATION')) {
        nameCol = c;
      }
      if (text.includes('SERVICE')) {
        servicesCol = c;
      }
    }
    if (nameCol !== -1) {
      headerRowNumber = rowNumber;
      break;
    }
  }

  if (nameCol === -1) {
    throw new Error('Could not find a "Name of Institution" column in the uploaded file');
  }
  if (servicesCol === -1) {
    servicesCol = nameCol + 1;
  }

  const records = [];
  for (const { rowNumber, cells } of rows) {
    if (rowNumber <= headerRowNumber) continue;
    const name = (cells[nameCol] || '').trim();
    if (!name) continue;
    const servicesRaw = (cells[servicesCol] || '').trim();
    const services = servicesRaw.split(',').map((s) => s.trim()).filter(Boolean);
    records.push({ rowNumber, name, services });
  }

  return records;
}

// GET /api/employers - List all employers for the gym
router.get(
  '/',
  authMiddleware,
  roleMiddleware(['manager', 'owner']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const { gym_id } = req.user;
      const employers = await db.all(
        `SELECT e.id, e.name, e.contact_email, e.phone, e.created_at,
                COALESCE(
                  (SELECT string_agg(s.name, ', ' ORDER BY s.name)
                   FROM employer_services es
                   JOIN services s ON s.id = es.service_id
                   WHERE es.employer_id = e.id),
                  ''
                ) AS allowed_services
         FROM employers e
         WHERE e.gym_id = ?
         ORDER BY e.name ASC`,
        [gym_id]
      );
      res.json({ employers });
    } catch (err) {
      console.error('Get employers error:', err.message);
      res.status(500).json({ error: 'Failed to load employers' });
    }
  }
);

// POST /api/employers - Create a new employer
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['owner', 'manager']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const { name, contact_email, phone } = req.body;
      const { gym_id } = req.user;

      if (!name) {
        return res.status(400).json({ error: 'Organization name is required' });
      }

      // Check if employer already exists
      const existing = await db.get(
        `SELECT id FROM employers WHERE gym_id = ? AND name = ?`,
        [gym_id, name.trim()]
      );

      if (existing) {
        return res.status(409).json({ error: 'Organization already exists' });
      }

      const employerId = uuidv4();
      await db.run(
        `INSERT INTO employers (id, gym_id, name, contact_email, phone)
         VALUES (?, ?, ?, ?, ?)`,
        [employerId, gym_id, name.trim(), contact_email?.trim() || null, phone?.trim() || null]
      );

      res.status(201).json({
        id: employerId,
        name: name.trim(),
        contact_email: contact_email?.trim() || null,
        phone: phone?.trim() || null
      });
    } catch (err) {
      console.error('Create employer error:', err.message);
      res.status(500).json({ error: 'Failed to create organization' });
    }
  }
);

// PATCH /api/employers/:id - Update employer details
router.patch(
  '/:id',
  authMiddleware,
  roleMiddleware(['owner', 'manager']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const employerId = req.params.id;
      const { name, contact_email, phone } = req.body;
      const { gym_id } = req.user;

      const employer = await db.get(
        `SELECT * FROM employers WHERE id = ? AND gym_id = ?`,
        [employerId, gym_id]
      );

      if (!employer) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const updateName = name ? name.trim() : employer.name;
      const updateEmail = contact_email !== undefined ? contact_email?.trim() || null : employer.contact_email;
      const updatePhone = phone !== undefined ? phone?.trim() || null : employer.phone;

      // Check for name collision
      if (updateName !== employer.name) {
        const existing = await db.get(
          `SELECT id FROM employers WHERE gym_id = ? AND name = ?`,
          [gym_id, updateName]
        );
        if (existing) {
          return res.status(409).json({ error: 'Another organization with this name already exists' });
        }
      }

      await db.run(
        `UPDATE employers
         SET name = ?, contact_email = ?, phone = ?
         WHERE id = ? AND gym_id = ?`,
        [updateName, updateEmail, updatePhone, employerId, gym_id]
      );

      res.json({
        id: employerId,
        name: updateName,
        contact_email: updateEmail,
        phone: updatePhone
      });
    } catch (err) {
      console.error('Update employer error:', err.message);
      res.status(500).json({ error: 'Failed to update organization' });
    }
  }
);

// DELETE /api/employers/:id - Delete an employer
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['owner']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const employerId = req.params.id;
      const { gym_id } = req.user;

      const employer = await db.get(
        `SELECT * FROM employers WHERE id = ? AND gym_id = ?`,
        [employerId, gym_id]
      );

      if (!employer) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Check if there are active B2B members associated.
      // Assuming B2B members might be linked via employer_id later, 
      // but right now there's no foreign key from members to employers.
      // We just delete the employer.
      await db.run(
        `DELETE FROM employers WHERE id = ? AND gym_id = ?`,
        [employerId, gym_id]
      );

      res.json({ success: true, message: 'Organization deleted' });
    } catch (err) {
      console.error('Delete employer error:', err.message);
      res.status(500).json({ error: 'Failed to delete organization' });
    }
  }
);

// POST /api/employers/bulk-upload - Register institutions + their allowed services from an Excel file
router.post(
  '/bulk-upload',
  authMiddleware,
  roleMiddleware(['owner', 'manager']),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'Failed to read uploaded file' });
      }
      next();
    });
  },
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { gym_id } = req.user;

      let records;
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          return res.status(400).json({ error: 'The uploaded file has no sheets' });
        }
        records = parseInstitutionsWorksheet(worksheet);
      } catch (parseErr) {
        console.error('Parse institutions workbook error:', parseErr.message);
        return res.status(400).json({ error: parseErr.message || 'Could not read the uploaded Excel file' });
      }

      if (records.length === 0) {
        return res.status(400).json({ error: 'No institutions found in the uploaded file' });
      }

      // Existing institutions/services for this gym, keyed case-insensitively so
      // "Supreme Court" and "SUPREME COURT" are treated as the same organization.
      const existingEmployers = await db.all(`SELECT id, name FROM employers WHERE gym_id = ?`, [gym_id]);
      const employersByName = new Map(existingEmployers.map((e) => [e.name.trim().toLowerCase(), e.id]));

      const existingServices = await db.all(`SELECT id, name FROM services WHERE gym_id = ?`, [gym_id]);
      const servicesByName = new Map(existingServices.map((s) => [s.name.trim().toLowerCase(), s.id]));

      const created = [];
      const duplicates = [];
      const servicesCreated = new Set();

      for (const record of records) {
        const key = record.name.toLowerCase();

        if (employersByName.has(key)) {
          duplicates.push({ row: record.rowNumber, name: record.name });
          continue;
        }

        const employerId = uuidv4();
        await db.run(`INSERT INTO employers (id, gym_id, name) VALUES (?, ?, ?)`, [employerId, gym_id, record.name]);
        employersByName.set(key, employerId);

        const serviceIds = new Set();
        for (const serviceName of record.services) {
          const serviceKey = serviceName.toLowerCase();
          let serviceId = servicesByName.get(serviceKey);

          if (!serviceId) {
            serviceId = uuidv4();
            await db.run(
              `INSERT INTO services (id, gym_id, name, price_daily, price_monthly, allow_monthly, category, sort_order)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [serviceId, gym_id, serviceKey, 0, 0, 1, serviceKey, 100]
            );
            servicesByName.set(serviceKey, serviceId);
            servicesCreated.add(serviceKey);
          }
          serviceIds.add(serviceId);
        }

        for (const serviceId of serviceIds) {
          await db.run(
            `INSERT INTO employer_services (employer_id, service_id) VALUES (?, ?)
             ON CONFLICT (employer_id, service_id) DO NOTHING`,
            [employerId, serviceId]
          );
        }

        created.push({ id: employerId, name: record.name, services: record.services });
      }

      res.status(201).json({
        created_count: created.length,
        duplicate_count: duplicates.length,
        employers: created,
        duplicates,
        services_created: Array.from(servicesCreated)
      });
    } catch (err) {
      console.error('Bulk upload employers error:', err.message);
      res.status(500).json({ error: 'Failed to process uploaded file' });
    }
  }
);

// GET /api/employers/:id/billing - Get 30-day billing report for an employer
router.get(
  '/:id/billing',
  authMiddleware,
  roleMiddleware(['owner', 'manager']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const employerId = req.params.id;
      const { gym_id } = req.user;

      const employer = await db.get(
        `SELECT * FROM employers WHERE id = ? AND gym_id = ?`,
        [employerId, gym_id]
      );

      if (!employer) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Determine date range from month parameter (e.g. '2026-06') or default to current month
      const monthParam = req.query.month;
      let startDateStr, endDateStr;

      if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
        startDateStr = `${monthParam}-01T00:00:00.000Z`;
        const start = new Date(startDateStr);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        endDateStr = end.toISOString();
      } else {
        // Default to last 30 days if no valid month is provided
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        startDateStr = thirtyDaysAgo.toISOString();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        endDateStr = tomorrow.toISOString();
      }

      // Fetch all services to build a price map
      const services = await db.all(
        `SELECT name, price_daily FROM services WHERE gym_id = ?`,
        [gym_id]
      );
      
      const servicePrices = {};
      services.forEach(s => {
        servicePrices[s.name.toLowerCase()] = Number(s.price_daily) || 0;
      });

      // Fetch all B2B check-ins for this employer's members in the date range
      const checkins = await db.all(
        `SELECT c.id, c.timestamp, c.member_name, c.service
         FROM checkins c
         JOIN members m ON c.member_id = m.id
         WHERE m.employer_id = ? AND c.gym_id = ? AND c.type = 'b2b' AND c.timestamp >= ? AND c.timestamp < ?
         ORDER BY c.timestamp DESC`,
        [employerId, gym_id, startDateStr, endDateStr]
      );

      let totalCost = 0;
      const report = checkins.map(c => {
        let cost = 0;
        const accessedServices = c.service.split(',').map(s => s.trim().toLowerCase());
        accessedServices.forEach(s => {
          cost += (servicePrices[s] || 0); // Apply standard daily price for each accessed service
        });
        totalCost += cost;
        
        return {
          id: c.id,
          date: c.timestamp,
          member_name: c.member_name,
          service: c.service,
          cost
        };
      });

      res.json({ employer, report, total_cost: totalCost });
    } catch (err) {
      console.error('Get employer billing error:', err.message);
      res.status(500).json({ error: 'Failed to generate billing report' });
    }
  }
);

export default router;
