const fs = require('fs');
const path = require('path');

function addSpace(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      addSpace(fullPath);
    } else if (file.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let modified = false;

      // Replace -mt-X pt-4 with -mt-X pt-10
      content = content.replace(/(-mt-\d+\s+)pt-4/g, (match, prefix) => {
        modified = true;
        return prefix + 'pt-10';
      });

      // Replace -mt-X pt-3 with -mt-X pt-10
      content = content.replace(/(-mt-\d+\s+)pt-3/g, (match, prefix) => {
        modified = true;
        return prefix + 'pt-10';
      });

      if (modified) {
        console.log('Added space to: ' + file);
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

addSpace('c:/Users/admin/Desktop/appzeto/DM-groceries/frontend/src/modules/delivery/pages');
