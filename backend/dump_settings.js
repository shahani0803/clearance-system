const mongoose = require('mongoose');

async function checkSettings() {
  await mongoose.connect('mongodb://127.0.0.1:27017/clearanceDB');
  const settingsSchema = new mongoose.Schema({}, { strict: false });
  const Settings = mongoose.model('Settings', settingsSchema, 'settings');

  const settings = await Settings.find();
  console.log("SETTINGS DUMP:");
  console.log(JSON.stringify(settings, null, 2));

  await mongoose.disconnect();
}

checkSettings();
