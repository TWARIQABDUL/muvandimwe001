import re

# services.js
with open('backend/src/api/services.js', 'r') as f:
    content = f.read()

content = content.replace(
    "const { gym_id } = req.user;",
    "const gym_id = req.user.query_all_gyms ? 'all' : (req.user.gym_id_override || req.user.gym_id);"
, 1) # Only replace the first occurrence (which is in GET /)
content = content.replace(
    "WHERE gym_id = ?",
    "WHERE (gym_id = ? OR ? = 'all')"
, 1)
content = content.replace(
    "[gym_id]",
    "[gym_id, gym_id]"
, 1)

with open('backend/src/api/services.js', 'w') as f:
    f.write(content)

# coupons.js
with open('backend/src/api/coupons.js', 'r') as f:
    content = f.read()

content = content.replace(
    "const { gym_id } = req.user;",
    "const gym_id = req.user.query_all_gyms ? 'all' : (req.user.gym_id_override || req.user.gym_id);"
, 1) # Only first occurrence
content = content.replace(
    "WHERE gym_id = ?",
    "WHERE (gym_id = ? OR ? = 'all')"
, 1)
content = content.replace(
    "[gym_id]",
    "[gym_id, gym_id]"
, 1)

with open('backend/src/api/coupons.js', 'w') as f:
    f.write(content)

# plans.js
with open('backend/src/api/plans.js', 'r') as f:
    content = f.read()

content = content.replace(
    "const { gym_id } = req.user;",
    "const gym_id = req.user.query_all_gyms ? 'all' : (req.user.gym_id_override || req.user.gym_id);"
, 1)
content = content.replace(
    "WHERE gym_id = ?",
    "WHERE (gym_id = ? OR ? = 'all')"
, 1)
content = content.replace(
    "[gym_id]",
    "[gym_id, gym_id]"
, 1)

with open('backend/src/api/plans.js', 'w') as f:
    f.write(content)

