const fs = require('fs');
const path = require('path');

function fixOverflow(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixOverflow(fullPath);
    } else if (file.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      if (content.includes('overflow-hidden') && !file.includes('DeliveryAuth.jsx') && !file.includes('Splash.jsx')) {
        // We want to remove 'overflow-hidden' from the main container of the page.
        // It's usually like className="bg-white min-h-screen pb-28 relative overflow-hidden font-sans"
        // Let's just do a string replacement for ' overflow-hidden'
        
        let modified = false;
        
        // Let's replace ' overflow-hidden' with '' where it appears in a class list that has min-h-screen
        const regex = /className="([^"]*min-h-screen[^"]*)\boverflow-hidden\b([^"]*)"/g;
        
        content = content.replace(regex, (match, before, after) => {
            modified = true;
            return `className="${before}${after}"`.replace('  ', ' ');
        });

        // Some might not have min-h-screen in the exact same string, let's also just try replacing 'overflow-hidden ' if the file is one of the problematic ones.
        // Actually, let's just use the regex.
        
        if (modified) {
          console.log('Removed overflow-hidden from: ' + file);
          fs.writeFileSync(fullPath, content, 'utf8');
        }
      }
    }
  }
}

fixOverflow('c:/Users/admin/Desktop/appzeto/DM-groceries/frontend/src/modules/delivery/pages');
