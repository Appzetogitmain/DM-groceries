const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (file.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const regex = /({\/\*\s*(?:Sticky )?(?:Deep Green )?Header(?: Banner)?\s*\*\/}\s*<div\s+className=")([^"]+)(")/g;
      
      let modified = false;
      content = content.replace(regex, (match, prefix, classes, suffix) => {
         if (!classes.includes('sticky')) {
            console.log('Fixed header in: ' + file);
            modified = true;
            return prefix + classes + ' sticky top-0 z-50' + suffix;
         }
         return match;
      });

      if (modified) {
         fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

processDir('c:/Users/admin/Desktop/appzeto/DM-groceries/frontend/src/modules/delivery/pages');
