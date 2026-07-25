const { MongoClient, ObjectId } = require('mongodb');
const MONGO_URI = "mongodb+srv://zarwebcoders:zarwebcoders@cluster0.lqgakzj.mongodb.net/gigdialapp";

async function main() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db();
    
    // Find user IRU
    const user = await db.collection('users').findOne({ email: 'iru@gmail.com' });
    
    if (!user) {
      console.log("User not found!");
      return;
    }
    
    console.log("Found user:", user.name, "- isApproved:", user.isApproved);
    
    // Approve the user
    const result = await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { isApproved: true, kycStatus: 'approved', updatedAt: new Date() } }
    );
    
    console.log("Updated:", result.modifiedCount, "document(s)");
    console.log("User IRU (iru@gmail.com) is now APPROVED!");
    
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
main();
