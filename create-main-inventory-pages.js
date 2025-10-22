// create-main-inventory-pages.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = path.join(__dirname, 'src', 'features', 'roles', 'manager', 'pages', 'main-inventory');

const pages = [
  { folder: 'add-item', component: 'AddItemPage' },
  { folder: 'dispatch/dispatch-factory', component: 'DispatchFactoryPage' },
  { folder: 'dispatch/dispatch-external', component: 'DispatchExternalPage' },
  { folder: 'search-edit', component: 'SearchEditPage' },
  { folder: 'view-stock', component: 'ViewStockPage' },
  { folder: 'delete-from-stock', component: 'DeleteFromStockPage' },
  { folder: 'delete-from-factory', component: 'DeleteFromFactoryPage' },
  { folder: 'delete-from-external', component: 'DeleteFromExternalPage' },
  { folder: 'transfer-to-print', component: 'TransferToPrintPage' },
  { folder: 'factory-return', component: 'FactoryReturnPage' },
];

for (const { folder, component } of pages) {
  const dirPath = path.join(baseDir, folder);
  const filePath = path.join(dirPath, 'index.tsx');

  // Create directories recursively
  fs.mkdirSync(dirPath, { recursive: true });

  // Placeholder code for each page
  const content = `import React from 'react';

const ${component} = () => {
  return (
    <div className="p-4">
      <h1>${component}</h1>
      <p>This is the ${component} page for Main Inventory.</p>
    </div>
  );
};

export default ${component};
`;

  // Write the file
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Created: ${filePath}`);
}

console.log('All main-inventory pages created successfully!');
