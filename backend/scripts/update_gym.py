import re

# dashboard.js
with open('backend/src/api/dashboard.js', 'r') as f:
    content = f.read()

# 1. getPaymentsForPeriod
content = content.replace(
    "SELECT * FROM payments WHERE gym_id = ? AND DATE(timestamp) = ?",
    "SELECT * FROM payments WHERE (gym_id = ? OR ? = 'all') AND DATE(timestamp) = ?"
).replace(
    "SELECT * FROM payments WHERE gym_id = ? AND DATE(timestamp) BETWEEN ? AND ?",
    "SELECT * FROM payments WHERE (gym_id = ? OR ? = 'all') AND DATE(timestamp) BETWEEN ? AND ?"
).replace(
    "startDate === endDate\n    ? [gymId, startDate]\n    : [gymId, startDate, endDate]",
    "startDate === endDate\n    ? [gymId, gymId, startDate]\n    : [gymId, gymId, startDate, endDate]"
)

# 2. activeSubs
content = content.replace(
    "WHERE gym_id = ? AND status = 'active'",
    "WHERE (gym_id = ? OR ? = 'all') AND status = 'active'"
).replace(
    "[gym_id]",
    "[gym_id, gym_id]"
)

# 3. subsData
content = content.replace(
    "WHERE ms.gym_id = ? AND ms.status = 'active'",
    "WHERE (ms.gym_id = ? OR ? = 'all') AND ms.status = 'active'"
)

# 4. getSubscriberReports
content = content.replace(
    "WHERE ms.gym_id = ? AND ms.start_date BETWEEN ? AND ?",
    "WHERE (ms.gym_id = ? OR ? = 'all') AND ms.start_date BETWEEN ? AND ?"
).replace(
    "[gymId, startDate, endDate]",
    "[gymId, gymId, startDate, endDate]"
).replace(
    "WHERE c.gym_id = ? AND c.type = 'subscription'",
    "WHERE (c.gym_id = ? OR ? = 'all') AND c.type = 'subscription'"
).replace(
    "[gymId, startDate, endDate, startDate]",
    "[gymId, gymId, startDate, endDate, startDate]"
)

# req.user
content = content.replace(
    "const { gym_id } = req.user;",
    "const gym_id = req.user.query_all_gyms ? 'all' : (req.user.gym_id_override || req.user.gym_id);"
)

with open('backend/src/api/dashboard.js', 'w') as f:
    f.write(content)


# analytics.js
with open('backend/src/api/analytics.js', 'r') as f:
    content = f.read()

content = content.replace(
    "const { gym_id } = req.user;",
    "const gym_id = req.user.query_all_gyms ? 'all' : (req.user.gym_id_override || req.user.gym_id);"
)
content = content.replace(
    "WHERE gym_id = ? AND DATE(timestamp) BETWEEN ? AND ?",
    "WHERE (gym_id = ? OR ? = 'all') AND DATE(timestamp) BETWEEN ? AND ?"
).replace(
    "[gym_id, startStr, endStr]",
    "[gym_id, gym_id, startStr, endStr]"
).replace(
    "[gym_id, startDate, endDate]",
    "[gym_id, gym_id, startDate, endDate]"
).replace(
    "WHERE ms.gym_id = ? AND ms.status = 'active'",
    "WHERE (ms.gym_id = ? OR ? = 'all') AND ms.status = 'active'"
).replace(
    "[gym_id]",
    "[gym_id, gym_id]"
)

with open('backend/src/api/analytics.js', 'w') as f:
    f.write(content)


# checkins.js
with open('backend/src/api/checkins.js', 'r') as f:
    content = f.read()

content = content.replace(
    "const { gym_id } = req.user;",
    "const gym_id = req.user.query_all_gyms ? 'all' : (req.user.gym_id_override || req.user.gym_id);"
)
content = content.replace(
    "WHERE gym_id = ? AND DATE(timestamp) = ?",
    "WHERE (gym_id = ? OR ? = 'all') AND DATE(timestamp) = ?"
).replace(
    "[gym_id, today]",
    "[gym_id, gym_id, today]"
).replace(
    "WHERE gym_id = ? AND DATE(timestamp) BETWEEN ? AND ?",
    "WHERE (gym_id = ? OR ? = 'all') AND DATE(timestamp) BETWEEN ? AND ?"
).replace(
    "[gymId, startDate, endDate]",
    "[gymId, gymId, startDate, endDate]"
)

with open('backend/src/api/checkins.js', 'w') as f:
    f.write(content)


# users.js
with open('backend/src/api/users.js', 'r') as f:
    content = f.read()

content = content.replace(
    "const gymId = req.user.gym_id;",
    "const gymId = req.user.query_all_gyms ? 'all' : (req.user.gym_id_override || req.user.gym_id);"
)
content = content.replace(
    "WHERE gym_id = ?",
    "WHERE (gym_id = ? OR ? = 'all')"
).replace(
    "[gymId]",
    "[gymId, gymId]"
)

with open('backend/src/api/users.js', 'w') as f:
    f.write(content)

