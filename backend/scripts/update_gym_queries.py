import os
import glob
import re

files_to_update = glob.glob('backend/src/api/*.js')

for filepath in files_to_update:
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Replace req.user.gym_id extraction
    content = re.sub(
        r'const { gym_id } = req\.user;',
        r"const gym_id = req.user.query_all_gyms ? 'all' : (req.user.gym_id_override || req.user.gym_id);",
        content
    )
    content = re.sub(
        r'const gymId = req\.user\.gym_id;',
        r"const gymId = req.user.query_all_gyms ? 'all' : (req.user.gym_id_override || req.user.gym_id);",
        content
    )
    
    # Replace queries
    # Look for gym_id = ? or c.gym_id = ? or ms.gym_id = ?
    # This is tricky because params need to be duplicated.
    # Instead of regex replacing the query and duplicating the param, I will do it manually for the complex files
    # or write a smarter regex if possible. Let's just output the files that need manual attention.
    
    print(filepath)

