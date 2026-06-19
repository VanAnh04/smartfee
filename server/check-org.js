import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartfee';

async function checkOrganization() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const Organization = (await import('./src/models/Organization.js')).default;
    const User = (await import('./src/models/User.js')).default;

    // Lấy tất cả organizations
    const orgs = await Organization.find({});
    console.log('\n=== DANH SÁCH TRUNG TÂM ===\n');
    
    for (const org of orgs) {
      console.log(`ID: ${org._id}`);
      console.log(`Name: ${org.name}`);
      console.log(`Address: ${org.address || '(chưa có)'}`);
      console.log(`Phone: ${org.phone || '(chưa có)'}`);
      console.log(`Email: ${org.email || '(chưa có)'}`);
      console.log(`Plan: ${org.plan}`);
      console.log('---');
      
      // Lấy thông tin user admin đầu tiên
      const adminUser = await User.findOne({ organizationId: org._id, role: 'admin' });
      if (adminUser) {
        console.log(`Admin User: ${adminUser.name} | ${adminUser.email}`);
      }
      console.log('\n');
    }

    // Nếu có organization đầu tiên, copy email từ admin vào org
    if (orgs.length > 0) {
      const firstOrg = orgs[0];
      const adminUser = await User.findOne({ organizationId: firstOrg._id, role: 'admin' });
      
      if (adminUser && !firstOrg.email) {
        console.log(`\n=== CẬP NHẬT EMAIL CHO TRUNG TÂM ===`);
        firstOrg.email = adminUser.email;
        await firstOrg.save();
        console.log(`Đã cập nhật email: ${adminUser.email}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkOrganization();
