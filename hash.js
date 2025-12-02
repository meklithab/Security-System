import bcrypt from "bcryptjs";

async function generateHashes() {
    const adminPassword = "AdminSecure123!";
    const manager1Password = "ManagerOne123!";
    const manager2Password = "ManagerTwo123!";

    const adminHash = await bcrypt.hash(adminPassword, 12);
    const manager1Hash = await bcrypt.hash(manager1Password, 12);
    const manager2Hash = await bcrypt.hash(manager2Password, 12);

    console.log("Admin Hash:", adminHash);
    console.log("Manager1 Hash:", manager1Hash);
    console.log("Manager2 Hash:", manager2Hash);
}

generateHashes();
