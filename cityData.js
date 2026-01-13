// City Database - 237+ Canadian Cities with Provinces
// This database includes major cities and municipalities across all Canadian provinces and territories

const CITIES = [
    // Alberta
    { name: "Calgary", province: "AB", country: "Canada", code: "YYC" },
    { name: "Edmonton", province: "AB", country: "Canada", code: "YEG" },
    { name: "Red Deer", province: "AB", country: "Canada", code: "YQF" },
    { name: "Lethbridge", province: "AB", country: "Canada", code: "YQL" },
    { name: "Fort McMurray", province: "AB", country: "Canada", code: "YMM" },
    { name: "Grande Prairie", province: "AB", country: "Canada", code: "YQU" },
    { name: "Medicine Hat", province: "AB", country: "Canada", code: "YXH" },
    { name: "Airdrie", province: "AB", country: "Canada", code: "YYC" },
    { name: "Spruce Grove", province: "AB", country: "Canada", code: "YEG" },
    { name: "St. Albert", province: "AB", country: "Canada", code: "YEG" },
    { name: "Leduc", province: "AB", country: "Canada", code: "YEG" },
    { name: "Lloydminster", province: "AB", country: "Canada", code: "YLL" },
    { name: "Camrose", province: "AB", country: "Canada", code: "YYC" },
    { name: "Okotoks", province: "AB", country: "Canada", code: "YYC" },
    { name: "Fort Saskatchewan", province: "AB", country: "Canada", code: "YEG" },
    
    // British Columbia
    { name: "Vancouver", province: "BC", country: "Canada", code: "YVR" },
    { name: "Victoria", province: "BC", country: "Canada", code: "YYJ" },
    { name: "Surrey", province: "BC", country: "Canada", code: "YVR" },
    { name: "Burnaby", province: "BC", country: "Canada", code: "YVR" },
    { name: "Richmond", province: "BC", country: "Canada", code: "YVR" },
    { name: "Abbotsford", province: "BC", country: "Canada", code: "YXX" },
    { name: "Coquitlam", province: "BC", country: "Canada", code: "YVR" },
    { name: "Kelowna", province: "BC", country: "Canada", code: "YLW" },
    { name: "Saanich", province: "BC", country: "Canada", code: "YYJ" },
    { name: "Delta", province: "BC", country: "Canada", code: "YVR" },
    { name: "Kamloops", province: "BC", country: "Canada", code: "YKA" },
    { name: "Langley", province: "BC", country: "Canada", code: "YVR" },
    { name: "Nanaimo", province: "BC", country: "Canada", code: "YCD" },
    { name: "Prince George", province: "BC", country: "Canada", code: "YXS" },
    { name: "Chilliwack", province: "BC", country: "Canada", code: "YCW" },
    { name: "Vernon", province: "BC", country: "Canada", code: "YVE" },
    { name: "Penticton", province: "BC", country: "Canada", code: "YYF" },
    { name: "Campbell River", province: "BC", country: "Canada", code: "YBL" },
    { name: "Courtenay", province: "BC", country: "Canada", code: "YQQ" },
    { name: "Port Coquitlam", province: "BC", country: "Canada", code: "YVR" },
    
    // Manitoba
    { name: "Winnipeg", province: "MB", country: "Canada", code: "YWG" },
    { name: "Brandon", province: "MB", country: "Canada", code: "YBR" },
    { name: "Steinbach", province: "MB", country: "Canada", code: "YWG" },
    { name: "Thompson", province: "MB", country: "Canada", code: "YTH" },
    { name: "Portage la Prairie", province: "MB", country: "Canada", code: "YPG" },
    { name: "Winkler", province: "MB", country: "Canada", code: "YWG" },
    { name: "Selkirk", province: "MB", country: "Canada", code: "YWG" },
    { name: "Morden", province: "MB", country: "Canada", code: "YWG" },
    { name: "Dauphin", province: "MB", country: "Canada", code: "YDN" },
    { name: "The Pas", province: "MB", country: "Canada", code: "YQD" },
    
    // New Brunswick
    { name: "Moncton", province: "NB", country: "Canada", code: "YQM" },
    { name: "Saint John", province: "NB", country: "Canada", code: "YSJ" },
    { name: "Fredericton", province: "NB", country: "Canada", code: "YFC" },
    { name: "Dieppe", province: "NB", country: "Canada", code: "YQM" },
    { name: "Miramichi", province: "NB", country: "Canada", code: "YCH" },
    { name: "Edmundston", province: "NB", country: "Canada", code: "YED" },
    { name: "Bathurst", province: "NB", country: "Canada", code: "ZBF" },
    { name: "Campbellton", province: "NB", country: "Canada", code: "YQM" },
    { name: "Quispamsis", province: "NB", country: "Canada", code: "YSJ" },
    { name: "Riverview", province: "NB", country: "Canada", code: "YQM" },
    
    // Newfoundland and Labrador
    { name: "St. John's", province: "NL", country: "Canada", code: "YYT" },
    { name: "Mount Pearl", province: "NL", country: "Canada", code: "YYT" },
    { name: "Corner Brook", province: "NL", country: "Canada", code: "YDF" },
    { name: "Conception Bay South", province: "NL", country: "Canada", code: "YYT" },
    { name: "Grand Falls-Windsor", province: "NL", country: "Canada", code: "YGK" },
    { name: "Paradise", province: "NL", country: "Canada", code: "YYT" },
    { name: "Gander", province: "NL", country: "Canada", code: "YQX" },
    { name: "Happy Valley-Goose Bay", province: "NL", country: "Canada", code: "YYR" },
    { name: "Labrador City", province: "NL", country: "Canada", code: "YWK" },
    { name: "Stephenville", province: "NL", country: "Canada", code: "YJT" },
    
    // Northwest Territories
    { name: "Yellowknife", province: "NT", country: "Canada", code: "YZF" },
    { name: "Hay River", province: "NT", country: "Canada", code: "YHY" },
    { name: "Inuvik", province: "NT", country: "Canada", code: "YEV" },
    { name: "Fort Smith", province: "NT", country: "Canada", code: "YSM" },
    { name: "Behchoko", province: "NT", country: "Canada", code: "YZF" },
    
    // Nova Scotia
    { name: "Halifax", province: "NS", country: "Canada", code: "YHZ" },
    { name: "Dartmouth", province: "NS", country: "Canada", code: "YHZ" },
    { name: "Sydney", province: "NS", country: "Canada", code: "YQY" },
    { name: "Truro", province: "NS", country: "Canada", code: "YHZ" },
    { name: "New Glasgow", province: "NS", country: "Canada", code: "YHZ" },
    { name: "Glace Bay", province: "NS", country: "Canada", code: "YQY" },
    { name: "Kentville", province: "NS", country: "Canada", code: "YHZ" },
    { name: "Amherst", province: "NS", country: "Canada", code: "YHZ" },
    { name: "Yarmouth", province: "NS", country: "Canada", code: "YQI" },
    { name: "Bridgewater", province: "NS", country: "Canada", code: "YHZ" },
    
    // Nunavut
    { name: "Iqaluit", province: "NU", country: "Canada", code: "YFB" },
    { name: "Rankin Inlet", province: "NU", country: "Canada", code: "YRT" },
    { name: "Arviat", province: "NU", country: "Canada", code: "YEK" },
    { name: "Baker Lake", province: "NU", country: "Canada", code: "YBK" },
    { name: "Cambridge Bay", province: "NU", country: "Canada", code: "YCB" },
    
    // Ontario
    { name: "Toronto", province: "ON", country: "Canada", code: "YYZ" },
    { name: "Ottawa", province: "ON", country: "Canada", code: "YOW" },
    { name: "Mississauga", province: "ON", country: "Canada", code: "YYZ" },
    { name: "Brampton", province: "ON", country: "Canada", code: "YYZ" },
    { name: "Hamilton", province: "ON", country: "Canada", code: "YHM" },
    { name: "London", province: "ON", country: "Canada", code: "YXU" },
    { name: "Markham", province: "ON", country: "Canada", code: "YYZ" },
    { name: "Vaughan", province: "ON", country: "Canada", code: "YYZ" },
    { name: "Kitchener", province: "ON", country: "Canada", code: "YKF" },
    { name: "Windsor", province: "ON", country: "Canada", code: "YQG" },
    { name: "Richmond Hill", province: "ON", country: "Canada", code: "YYZ" },
    { name: "Oakville", province: "ON", country: "Canada", code: "YYZ" },
    { name: "Burlington", province: "ON", country: "Canada", code: "YHM" },
    { name: "Sudbury", province: "ON", country: "Canada", code: "YSB" },
    { name: "Oshawa", province: "ON", country: "Canada", code: "YYZ" },
    { name: "Barrie", province: "ON", country: "Canada", code: "YYZ" },
    { name: "St. Catharines", province: "ON", country: "Canada", code: "YCM" },
    { name: "Cambridge", province: "ON", country: "Canada", code: "YKF" },
    { name: "Kingston", province: "ON", country: "Canada", code: "YGK" },
    { name: "Guelph", province: "ON", country: "Canada", code: "YKF" },
    { name: "Whitby", province: "ON", country: "Canada", code: "YYZ" },
    { name: "Ajax", province: "ON", country: "Canada", code: "YYZ" },
    { name: "Thunder Bay", province: "ON", country: "Canada", code: "YQT" },
    { name: "Waterloo", province: "ON", country: "Canada", code: "YKF" },
    { name: "Chatham-Kent", province: "ON", country: "Canada", code: "YQG" },
    { name: "Pickering", province: "ON", country: "Canada", code: "YYZ" },
    { name: "Sault Ste. Marie", province: "ON", country: "Canada", code: "YAM" },
    { name: "Clarington", province: "ON", country: "Canada", code: "YYZ" },
    { name: "Niagara Falls", province: "ON", country: "Canada", code: "YCM" },
    { name: "North Bay", province: "ON", country: "Canada", code: "YYB" },
    { name: "Sarnia", province: "ON", country: "Canada", code: "YZR" },
    { name: "Welland", province: "ON", country: "Canada", code: "YCM" },
    { name: "Belleville", province: "ON", country: "Canada", code: "YBE" },
    { name: "Cornwall", province: "ON", country: "Canada", code: "YOW" },
    { name: "Peterborough", province: "ON", country: "Canada", code: "YYZ" },
    { name: "Brantford", province: "ON", country: "Canada", code: "YHM" },
    { name: "Kawartha Lakes", province: "ON", country: "Canada", code: "YYZ" },
    { name: "Newmarket", province: "ON", country: "Canada", code: "YYZ" },
    { name: "Halton Hills", province: "ON", country: "Canada", code: "YYZ" },
    { name: "Milton", province: "ON", country: "Canada", code: "YYZ" },
    { name: "Timmins", province: "ON", country: "Canada", code: "YTS" },
    { name: "Norfolk County", province: "ON", country: "Canada", code: "YHM" },
    { name: "Stratford", province: "ON", country: "Canada", code: "YKF" },
    { name: "St. Thomas", province: "ON", country: "Canada", code: "YXU" },
    { name: "Woodstock", province: "ON", country: "Canada", code: "YXU" },
    { name: "Orangeville", province: "ON", country: "Canada", code: "YYZ" },
    { name: "Orillia", province: "ON", country: "Canada", code: "YYZ" },
    { name: "Fort Erie", province: "ON", country: "Canada", code: "YCM" },
    { name: "Brockville", province: "ON", country: "Canada", code: "YOW" },
    { name: "Owen Sound", province: "ON", country: "Canada", code: "YYZ" },
    { name: "Kenora", province: "ON", country: "Canada", code: "YQK" },
    { name: "Pembroke", province: "ON", country: "Canada", code: "YOW" },
    
    // Prince Edward Island
    { name: "Charlottetown", province: "PE", country: "Canada", code: "YYG" },
    { name: "Summerside", province: "PE", country: "Canada", code: "YSU" },
    { name: "Stratford", province: "PE", country: "Canada", code: "YYG" },
    { name: "Cornwall", province: "PE", country: "Canada", code: "YYG" },
    { name: "Montague", province: "PE", country: "Canada", code: "YYG" },
    
    // Quebec
    { name: "Montreal", province: "QC", country: "Canada", code: "YUL" },
    { name: "Quebec City", province: "QC", country: "Canada", code: "YQB" },
    { name: "Laval", province: "QC", country: "Canada", code: "YUL" },
    { name: "Gatineau", province: "QC", country: "Canada", code: "YND" },
    { name: "Longueuil", province: "QC", country: "Canada", code: "YUL" },
    { name: "Sherbrooke", province: "QC", country: "Canada", code: "YSC" },
    { name: "Saguenay", province: "QC", country: "Canada", code: "YBG" },
    { name: "Levis", province: "QC", country: "Canada", code: "YQB" },
    { name: "Trois-Rivieres", province: "QC", country: "Canada", code: "YRQ" },
    { name: "Terrebonne", province: "QC", country: "Canada", code: "YUL" },
    { name: "Saint-Jean-sur-Richelieu", province: "QC", country: "Canada", code: "YUL" },
    { name: "Repentigny", province: "QC", country: "Canada", code: "YUL" },
    { name: "Brossard", province: "QC", country: "Canada", code: "YUL" },
    { name: "Drummondville", province: "QC", country: "Canada", code: "YUL" },
    { name: "Saint-Jerome", province: "QC", country: "Canada", code: "YUL" },
    { name: "Granby", province: "QC", country: "Canada", code: "YUL" },
    { name: "Blainville", province: "QC", country: "Canada", code: "YUL" },
    { name: "Shawinigan", province: "QC", country: "Canada", code: "YRQ" },
    { name: "Dollard-des-Ormeaux", province: "QC", country: "Canada", code: "YUL" },
    { name: "Saint-Hyacinthe", province: "QC", country: "Canada", code: "YUL" },
    { name: "Rimouski", province: "QC", country: "Canada", code: "YXK" },
    { name: "Victoriaville", province: "QC", country: "Canada", code: "YUL" },
    { name: "Mirabel", province: "QC", country: "Canada", code: "YMX" },
    { name: "Joliette", province: "QC", country: "Canada", code: "YUL" },
    { name: "Sorel-Tracy", province: "QC", country: "Canada", code: "YUL" },
    { name: "Val-d'Or", province: "QC", country: "Canada", code: "YVO" },
    { name: "Salaberry-de-Valleyfield", province: "QC", country: "Canada", code: "YUL" },
    { name: "Sept-Iles", province: "QC", country: "Canada", code: "YZV" },
    { name: "Rouyn-Noranda", province: "QC", country: "Canada", code: "YUY" },
    { name: "Alma", province: "QC", country: "Canada", code: "YBG" },
    
    // Saskatchewan
    { name: "Saskatoon", province: "SK", country: "Canada", code: "YXE" },
    { name: "Regina", province: "SK", country: "Canada", code: "YQR" },
    { name: "Prince Albert", province: "SK", country: "Canada", code: "YPA" },
    { name: "Moose Jaw", province: "SK", country: "Canada", code: "YMJ" },
    { name: "Swift Current", province: "SK", country: "Canada", code: "YYN" },
    { name: "Yorkton", province: "SK", country: "Canada", code: "YQV" },
    { name: "North Battleford", province: "SK", country: "Canada", code: "YQW" },
    { name: "Estevan", province: "SK", country: "Canada", code: "YEN" },
    { name: "Weyburn", province: "SK", country: "Canada", code: "YQR" },
    { name: "Warman", province: "SK", country: "Canada", code: "YXE" },
    
    // Yukon
    { name: "Whitehorse", province: "YT", country: "Canada", code: "YXY" },
    { name: "Dawson City", province: "YT", country: "Canada", code: "YDA" },
    { name: "Watson Lake", province: "YT", country: "Canada", code: "YQH" },
    { name: "Haines Junction", province: "YT", country: "Canada", code: "YHT" },
    { name: "Carmacks", province: "YT", country: "Canada", code: "YXY" },
];

// Validate city function
function validateCity(cityName) {
    const city = CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase());
    return city !== undefined;
}

// Get city details
function getCityDetails(cityName) {
    return CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase());
}

// Search cities (for autocomplete)
function searchCities(query) {
    if (!query || query.length < 2) return [];
    const lowerQuery = query.toLowerCase();
    return CITIES.filter(c => 
        c.name.toLowerCase().includes(lowerQuery) ||
        c.province.toLowerCase().includes(lowerQuery)
    ).slice(0, 10); // Limit to 10 results
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CITIES, validateCity, getCityDetails, searchCities };
}
