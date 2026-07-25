const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://zarwebcoders:zarwebcoders@cluster0.lqgakzj.mongodb.net/gigdialapp";

async function main() {
  const client = new MongoClient(uri);
  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    console.log("Connected successfully!");

    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log(`\nFound ${collections.length} collections:`);

    for (const col of collections) {
      const name = col.name;
      const count = await db.collection(name).countDocuments();
      console.log(`\n- ${name} (Count: ${count})`);

      if (count > 0) {
        const sample = await db.collection(name).findOne();
        console.log("  Sample Document keys:", Object.keys(sample));
        console.log("  Sample Document preview:", JSON.stringify(sample, null, 2));
      } else {
        console.log("  Empty collection.");
      }
    }
  } catch (err) {
    console.error("Database connection error:", err);
  } finally {
    await client.close();
  }
}

main();
