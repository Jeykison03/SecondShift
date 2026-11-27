// Values mirror the Postgres enums in supabase/migrations. Keep them in sync.

export const CONDITION_GRADES = [
  { value: 'like_new',  label: 'Like new',  short: 'A', desc: 'No visible marks. Works perfectly.' },
  { value: 'very_good', label: 'Very good', short: 'B', desc: 'Light signs of use, hard to spot. Works perfectly.' },
  { value: 'good',      label: 'Good',      short: 'C', desc: 'Visible scratches or wear. Works perfectly.' },
  { value: 'fair',      label: 'Fair',      short: 'D', desc: 'Heavy wear or a minor functional issue (described).' },
]
export const gradeLabel = (v) => CONDITION_GRADES.find((g) => g.value === v)?.label ?? v

export const LISTING_STATUS = {
  draft:    { label: 'Draft',    tone: 'neutral' },
  active:   { label: 'Active',   tone: 'success' },
  reserved: { label: 'Reserved', tone: 'warning' },
  sold:     { label: 'Sold',     tone: 'info' },
  archived: { label: 'Paused',   tone: 'neutral' },
  removed:  { label: 'Removed',  tone: 'danger' },
}

export const VERIFICATION_STATUS = {
  unverified: { label: 'Not verified',    tone: 'neutral' },
  pending:    { label: 'In review',       tone: 'warning' },
  verified:   { label: 'Verified seller', tone: 'success' },
  rejected:   { label: 'Rejected',        tone: 'danger' },
}

export const COMPANY_TYPES = [
  { value: 'corporate', label: 'Large company / PLC' },
  { value: 'sme', label: 'Private limited company (Pvt) Ltd' },
  { value: 'startup', label: 'Startup' },
  { value: 'freelancer', label: 'Sole proprietorship / partnership' },
  { value: 'nonprofit', label: 'NGO / non-profit' },
  { value: 'education', label: 'School / university' },
  { value: 'public_sector', label: 'Government / state institution' },
]

export const INDUSTRIES = [
  'IT & software', 'BPO / KPO', 'Banking & finance', 'Insurance', 'Telecommunications',
  'Apparel & textiles', 'Tea, rubber & agriculture', 'Tourism & hospitality', 'Healthcare',
  'Education', 'Manufacturing', 'Retail & trading', 'Logistics & shipping', 'Construction',
  'Media & advertising', 'Government', 'Other',
]

/** The 25 administrative districts of Sri Lanka, grouped by province. */
export const DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara',                 // Western
  'Kandy', 'Matale', 'Nuwara Eliya',                // Central
  'Galle', 'Matara', 'Hambantota',                  // Southern
  'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu', // Northern
  'Batticaloa', 'Ampara', 'Trincomalee',            // Eastern
  'Kurunegala', 'Puttalam',                         // North Western
  'Anuradhapura', 'Polonnaruwa',                    // North Central
  'Badulla', 'Monaragala',                          // Uva
  'Ratnapura', 'Kegalle',                           // Sabaragamuwa
]
export const COUNTRY = { code: 'LK', name: 'Sri Lanka' }
export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+']

export const USAGE_INTENSITY = [
  { value: 'light',  label: 'Light',  desc: 'Occasional office use' },
  { value: 'normal', label: 'Normal', desc: 'Daily office work' },
  { value: 'heavy',  label: 'Heavy',  desc: 'Development, design, 24/7' },
]

export const WARRANTY_TYPES = [
  { value: 'none', label: 'No warranty', desc: 'Sold as described' },
  { value: 'manufacturer', label: 'Manufacturer', desc: 'Remaining OEM warranty' },
  { value: 'seller', label: 'Our warranty', desc: 'You cover defects' },
]

export const WIPE_METHODS = [
  'NIST 800-88 purge (certified software)',
  'Blancco / certified erasure tool',
  'Secure erase (SSD firmware)',
  'Drive physically removed',
  'Factory reset (phones / tablets / network gear)',
  'Other',
]

export const VERIFICATION_DOC_TYPES = [
  { value: 'br_certificate', label: 'Business Registration (BR) certificate' },
  { value: 'incorporation_certificate', label: 'Certificate of Incorporation (Registrar of Companies)' },
  { value: 'tin_certificate', label: 'TIN certificate (Inland Revenue Department)' },
  { value: 'vat_certificate', label: 'VAT registration certificate (IRD)' },
  { value: 'other', label: 'Other official document' },
]

export const ACCESSORY_SUGGESTIONS = ['Charger', 'Power cable', 'Original box', 'Docking station', 'Stand', 'HDMI cable', 'USB-C cable', 'Receiver', 'Manual']

export const BUCKETS = {
  listingPhotos: 'listing-photos',
  companyLogos: 'company-logos',
  avatars: 'avatars',
  verificationDocs: 'verification-docs',
  wipeCertificates: 'wipe-certificates',
}

export const MAX_PHOTOS = 12
export const MAX_PHOTO_MB = 10
