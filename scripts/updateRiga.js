const db = require("../services/databaseService");

async function updateRigaRate() {
  await db.connect();

  return new Promise((resolve, reject) => {
    db.db.run(
      `
      UPDATE travel_rates 
      SET jan_accommodation = 209,
          feb_accommodation = 209,
          mar_accommodation = 209,
          apr_accommodation = 209,
          may_accommodation = 209,
          jun_accommodation = 209,
          jul_accommodation = 209,
          aug_accommodation = 209,
          sep_accommodation = 209,
          oct_accommodation = 209,
          nov_accommodation = 209,
          dec_accommodation = 209,
          standard_accommodation = 209,
          currency = 'CAD'
      WHERE LOWER(city_name) = 'riga'
    `,
      [],
      (err) => {
        if (err) {
          console.error("❌ Error:", err);
          reject(err);
        } else {
          console.log("✅ Riga accommodation updated to CAD $209");
          resolve();
        }
        db.close();
      }
    );
  });
}

updateRigaRate().catch(console.error);
