// Builds the daily report the gym used to send by hand on WhatsApp.
//
// Layout it reproduces:
//
//   Gym's Report            <- one section per service category
//   Daily:4=16k             <- paying walk-ins / day passes
//   Old:6                   <- existing subscribers who came in
//   Vip:0                   <- card / partner signatures (no cash)
//   New:60k(for 2 month)    <- sign-ups paid for today
//   Total number:11
//   Total amount:76k
//
//   Amazi:4=6000rwf         <- point-of-sale items
//   Total amount:143,000rwf
//   Last Balance:...        <- yesterday's closing momo
//   Today's Momo:...

const DAY_SUFFIX = (day) => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

// 16000 -> "16k", 15500 -> "15,500". Round thousands read the way the gym writes them.
export function formatK(value) {
  const n = Math.round(Number(value) || 0);
  if (n !== 0 && n % 1000 === 0) return `${n / 1000}k`;
  return n.toLocaleString('en-US');
}

export function formatRwf(value) {
  return `${Math.round(Number(value) || 0).toLocaleString('en-US')}rwf`;
}

// '2026-09-20' -> '20th/09/2026'
export function formatReportDate(dateStr) {
  const [year, month, day] = String(dateStr).split('-');
  const dayNum = Number(day);
  return `${dayNum}${DAY_SUFFIX(dayNum)}/${month}/${year}`;
}

function titleCase(value) {
  return String(value || '')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function previousDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
}

function splitServices(value) {
  return String(value || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

function emptySection(category) {
  return {
    category,
    services: [],
    daily: [],
    old: [],
    vip: [],
    new_subscriptions: [],
    renewals: [],
    total_number: 0,
    total_amount: 0
  };
}

/**
 * Gathers everything the report needs for one gym on one date.
 * `gymId` may be 'all' to combine branches.
 */
export async function buildDailyReport(db, gymId, date) {
  const services = await db.all(
    `SELECT name, category, sort_order FROM services WHERE (gym_id = ? OR ? = 'all')`,
    [gymId, gymId]
  );

  // service name -> report section it belongs to
  const categoryOfService = new Map();
  const orderOfCategory = new Map();
  const servicesInCategory = new Map();

  services.forEach(s => {
    const name = String(s.name || '').trim().toLowerCase();
    if (!name) return;
    const category = String(s.category || name).trim().toLowerCase();
    const order = Number(s.sort_order);
    categoryOfService.set(name, category);
    if (!servicesInCategory.has(category)) servicesInCategory.set(category, new Set());
    servicesInCategory.get(category).add(name);
    const current = orderOfCategory.get(category);
    const resolved = Number.isFinite(order) ? order : 100;
    if (current === undefined || resolved < current) orderOfCategory.set(category, resolved);
  });

  const resolveCategory = (serviceName) => categoryOfService.get(serviceName) || serviceName;

  const checkins = await db.all(
    `SELECT c.id, c.member_id, c.member_name, c.type, c.service, c.amount, c.timestamp,
            ms.is_card, ms.start_date AS sub_start_date,
            e.name AS employer_name
     FROM checkins c
     LEFT JOIN members m ON c.member_id = m.id
     LEFT JOIN member_subscriptions ms ON m.current_subscription_id = ms.id
     LEFT JOIN employers e ON m.employer_id = e.id
     WHERE (c.gym_id = ? OR ? = 'all') AND DATE(c.timestamp) = ?
     ORDER BY c.timestamp ASC`,
    [gymId, gymId, date]
  );

  const payments = await db.all(
    `SELECT p.id, p.member_id, p.amount, p.type, p.service, p.months, p.payment_method, p.timestamp,
            m.name AS member_name
     FROM payments p
     LEFT JOIN members m ON p.member_id = m.id
     WHERE (p.gym_id = ? OR ? = 'all') AND DATE(p.timestamp) = ?
     ORDER BY p.timestamp ASC`,
    [gymId, gymId, date]
  );

  const productSales = await db.all(
    `SELECT pr.name, pr.sort_order,
            SUM(ps.quantity) AS quantity,
            SUM(ps.amount) AS amount
     FROM product_sales ps
     JOIN products pr ON ps.product_id = pr.id
     WHERE (ps.gym_id = ? OR ? = 'all') AND DATE(ps.sold_at) = ?
     GROUP BY pr.name, pr.sort_order
     ORDER BY pr.sort_order ASC, pr.name ASC`,
    [gymId, gymId, date]
  );

  const productsByMethod = await db.all(
    `SELECT payment_method, SUM(amount) AS amount
     FROM product_sales
     WHERE (gym_id = ? OR ? = 'all') AND DATE(sold_at) = ?
     GROUP BY payment_method`,
    [gymId, gymId, date]
  );

  const sections = new Map();
  const sectionFor = (category) => {
    if (!sections.has(category)) sections.set(category, emptySection(category));
    return sections.get(category);
  };

  // Every known category shows up even on a quiet day, so the owner can see it was checked.
  servicesInCategory.forEach((names, category) => {
    sectionFor(category).services = [...names].sort();
  });

  const vipByMember = new Map();

  // A member who paid for a subscription today is reported under New or Renewal.
  // Counting their visit under Old as well would inflate "Total number".
  const paidTodayMembers = new Set(
    payments
      .filter(p => p.type === 'subscription_signup' || p.type === 'subscription_renewal')
      .map(p => p.member_id)
      .filter(Boolean)
  );

  checkins.forEach(c => {
    const serviceNames = splitServices(c.service);
    if (serviceNames.length === 0) return;

    const amount = Number(c.amount) || 0;
    const share = amount / serviceNames.length;
    const isVip = c.type === 'b2b' || Number(c.is_card) === 1;
    const alreadyCountedAsPaying = c.member_id ? paidTodayMembers.has(c.member_id) : false;

    serviceNames.forEach(serviceName => {
      const section = sectionFor(resolveCategory(serviceName));
      const entry = {
        member_id: c.member_id || null,
        name: c.member_name,
        service: serviceName,
        amount: share,
        employer: c.employer_name || null
      };

      if (isVip) {
        section.vip.push(entry);
      } else if (c.type === 'walk_in' || c.type === 'daily') {
        section.daily.push(entry);
      } else if (c.type === 'subscription' && !alreadyCountedAsPaying) {
        section.old.push(entry);
      }
    });

    if (isVip) {
      const key = c.member_id || `name:${c.member_name}`;
      if (!vipByMember.has(key)) {
        vipByMember.set(key, {
          name: c.member_name,
          employer: c.employer_name || null,
          signs: 0,
          by_service: {}
        });
      }
      const vip = vipByMember.get(key);
      vip.signs += 1;
      serviceNames.forEach(serviceName => {
        vip.by_service[serviceName] = (vip.by_service[serviceName] || 0) + 1;
      });
    }
  });

  payments.forEach(p => {
    if (p.type !== 'subscription_signup' && p.type !== 'subscription_renewal') return;

    const serviceNames = splitServices(p.service);
    if (serviceNames.length === 0) return;

    const amount = Number(p.amount) || 0;
    const share = amount / serviceNames.length;
    const months = p.months === null || p.months === undefined ? null : Number(p.months);

    serviceNames.forEach(serviceName => {
      const section = sectionFor(resolveCategory(serviceName));
      const entry = {
        member_id: p.member_id || null,
        name: p.member_name,
        service: serviceName,
        amount: share,
        months
      };
      if (p.type === 'subscription_signup') section.new_subscriptions.push(entry);
      else section.renewals.push(entry);
    });
  });

  const orderedSections = [...sections.values()]
    .map(section => {
      const revenue = [...section.daily, ...section.new_subscriptions, ...section.renewals]
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        ...section,
        // A section holding several services (relax / swedish / deep tissue) is
        // listed item by item; a single-service section is just counted.
        itemized: section.services.length > 1,
        total_number:
          section.daily.length +
          section.old.length +
          section.vip.length +
          section.new_subscriptions.length +
          section.renewals.length,
        total_amount: revenue
      };
    })
    .sort((a, b) => {
      const orderA = orderOfCategory.get(a.category) ?? 100;
      const orderB = orderOfCategory.get(b.category) ?? 100;
      if (orderA !== orderB) return orderA - orderB;
      return a.category.localeCompare(b.category);
    });

  const products = productSales.map(p => ({
    name: p.name,
    quantity: Number(p.quantity) || 0,
    amount: Number(p.amount) || 0
  }));

  const servicesTotal = orderedSections.reduce((sum, s) => sum + s.total_amount, 0);
  const productsTotal = products.reduce((sum, p) => sum + p.amount, 0);

  // Across branches there is a note per gym, so the balances are added up
  // rather than picking one branch at random.
  const todayNotes = await db.all(
    `SELECT momo_balance, cash_balance, note FROM closing_notes
     WHERE (gym_id = ? OR ? = 'all') AND report_date = ?`,
    [gymId, gymId, date]
  );
  const yesterdayNotes = await db.all(
    `SELECT momo_balance FROM closing_notes
     WHERE (gym_id = ? OR ? = 'all') AND report_date = ?`,
    [gymId, gymId, previousDay(date)]
  );

  // Null means "nobody recorded it", which reads differently from a recorded zero.
  const sumBalances = (rows, column) => {
    const values = rows
      .map(r => r[column])
      .filter(v => v !== null && v !== undefined);
    if (values.length === 0) return null;
    return values.reduce((sum, v) => sum + Number(v), 0);
  };

  const sumByMethod = (rows, isMomo) => rows
    .filter(r => (r.payment_method === 'MOMO') === isMomo)
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  // Shop sales are taken the same ways services are, so they count towards the split.
  const cashTotal = sumByMethod(payments, false) + sumByMethod(productsByMethod, false);
  const momoTotal = sumByMethod(payments, true) + sumByMethod(productsByMethod, true);

  return {
    date,
    display_date: formatReportDate(date),
    sections: orderedSections,
    products,
    vip_members: [...vipByMember.values()].sort((a, b) => b.signs - a.signs),
    totals: {
      services: servicesTotal,
      products: productsTotal,
      grand_total: servicesTotal + productsTotal,
      cash: cashTotal,
      momo: momoTotal
    },
    balances: {
      last_balance: sumBalances(yesterdayNotes, 'momo_balance'),
      today_momo: sumBalances(todayNotes, 'momo_balance'),
      cash_balance: sumBalances(todayNotes, 'cash_balance')
    },
    note: todayNotes.map(n => n.note).filter(Boolean).join('\n')
  };
}

const INDENT = '      ';

function renderItemLines(label, entries, renderEntry) {
  // First item sits on the label line, the rest line up under it.
  const rendered = entries.map(renderEntry);
  const lines = [`${label}:${rendered[0]}`];
  rendered.slice(1).forEach(item => lines.push(`${INDENT}${item}`));
  return lines;
}

function renderSubscriptionLine(label, entries) {
  const parts = entries.map(e => {
    const amount = formatK(e.amount);
    if (e.months) return `${amount}(for ${e.months} month)`;
    return amount;
  });
  return `${label}:${parts.join(', ')}`;
}

function renderSection(section) {
  const lines = [`${titleCase(section.category)}'s Report`];

  if (section.itemized && section.daily.length > 0) {
    lines.push(...renderItemLines('Daily', section.daily, e => `_${titleCase(e.service)} ${formatK(e.amount)}`));
  } else {
    const amount = section.daily.reduce((sum, e) => sum + e.amount, 0);
    lines.push(`Daily:${section.daily.length}${section.daily.length > 0 ? `=${formatK(amount)}` : ''}`);
  }

  lines.push(`Old:${section.old.length}`);

  if (section.itemized && section.vip.length > 0) {
    lines.push(...renderItemLines('Vip', section.vip, e => {
      const employer = e.employer ? `(${e.employer.toUpperCase()})` : '';
      return `_${titleCase(e.service)} Vip${employer}`;
    }));
  } else {
    lines.push(`Vip:${section.vip.length}`);
  }

  if (section.new_subscriptions.length > 0) {
    lines.push(renderSubscriptionLine('New', section.new_subscriptions));
  }
  if (section.renewals.length > 0) {
    lines.push(renderSubscriptionLine('Renewal', section.renewals));
  }

  lines.push(`Total number:${section.total_number}`);
  lines.push(`Total amount:${formatK(section.total_amount)}`);

  return lines.join('\n');
}

/**
 * Renders the report as the three WhatsApp messages the gym is used to sending:
 * the summary, the itemised breakdown, and the VIP signatures.
 * `details` and `vip` come back null when there is nothing to report.
 */
export function renderWhatsAppMessages(report) {
  const blocks = [`Hello,\nReport on ${report.display_date}`];

  report.sections.forEach(section => blocks.push(renderSection(section)));

  if (report.products.length > 0) {
    blocks.push(
      report.products
        .map(p => {
          const name = titleCase(p.name);
          if (p.quantity > 1) return `${name}:${p.quantity}=${formatRwf(p.amount)}`;
          return `${name}:${formatRwf(p.amount)}`;
        })
        .join('\n')
    );
  }

  const footer = [`Total amount:${formatRwf(report.totals.grand_total)}`];
  if (report.balances.last_balance !== null) {
    footer.push(`Last Balance:${formatRwf(report.balances.last_balance)}`);
  }
  if (report.balances.today_momo !== null) {
    footer.push(`Today's Momo:${formatRwf(report.balances.today_momo)}`);
  }
  blocks.push(footer.join('\n'));

  const summary = blocks.join('\n\n');

  // Second message: who received what, for sections with several services.
  const detailBlocks = [];
  report.sections
    .filter(section => section.itemized)
    .forEach(section => {
      const entries = [
        ...section.daily.map(e => ({ ...e, vip: false })),
        ...section.vip.map(e => ({ ...e, vip: true }))
      ];
      if (entries.length === 0) return;

      const lines = [`Hello,\n${titleCase(section.category)}'s Report\non ${report.display_date}`, ''];
      entries.forEach((e, i) => {
        const suffix = e.vip
          ? `Vip${e.employer ? ` (${e.employer.toUpperCase()})` : ''}`
          : formatK(e.amount);
        lines.push(`${i + 1}.${e.name}:_${titleCase(e.service)} ${suffix}`);
      });
      detailBlocks.push(lines.join('\n'));
    });

  const details = detailBlocks.length > 0 ? detailBlocks.join('\n\n') : null;

  // Third message: signatures collected from card and partner members.
  let vip = null;
  if (report.vip_members.length > 0) {
    const lines = ["Vip's report", ''];
    report.vip_members.forEach((member, i) => {
      const employer = member.employer ? `(${member.employer.toUpperCase()})` : '';
      const breakdown = Object.entries(member.by_service)
        .map(([service, count]) => `${count} for ${titleCase(service)}`)
        .join(', ');
      lines.push(`${i + 1}.${member.name}${employer} ${member.signs}signs (${breakdown})`);
    });
    vip = lines.join('\n');
  }

  return { summary, details, vip };
}
