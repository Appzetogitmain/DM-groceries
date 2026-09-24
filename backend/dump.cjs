const mongoose = require("mongoose");
const fs = require("fs");

async function check() {
  await mongoose.connect("mongodb://localhost:27017/DM-groceries", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  const productSchema = new mongoose.Schema({}, { strict: false });
  const Product = mongoose.model("Product", productSchema, "products");
  
  const p = await Product.findOne({ name: /Ice-cream/i });
  fs.writeFileSync("product_dump.json", JSON.stringify(p, null, 2));
  console.log("Dumped to product_dump.json");
  process.exit(0);
}

check();
