-- =====================================================================
-- SecondShift · seed data
-- Categories + the spec fields the "create listing" form shows per category.
-- Field types: text | number | boolean | select | multiselect
-- Safe to re-run (upsert on slug).
-- =====================================================================

insert into public.categories (slug, name, icon, sort_order, spec_schema) values
('laptops', 'Laptops', 'laptop', 10, '[
  {"key":"cpu","label":"Processor","type":"text","placeholder":"Intel Core i5-1245U","required":true},
  {"key":"ram_gb","label":"RAM","type":"number","unit":"GB","required":true},
  {"key":"storage_gb","label":"Storage","type":"number","unit":"GB","required":true},
  {"key":"storage_type","label":"Storage type","type":"select","options":["NVMe SSD","SATA SSD","HDD","eMMC"]},
  {"key":"screen_inches","label":"Screen size","type":"number","unit":"in"},
  {"key":"resolution","label":"Resolution","type":"select","options":["1366x768","1920x1080","1920x1200","2560x1440","2560x1600","2880x1800","3840x2160","Other"]},
  {"key":"touchscreen","label":"Touchscreen","type":"boolean"},
  {"key":"gpu","label":"Graphics","type":"text","placeholder":"Integrated / NVIDIA RTX A500"},
  {"key":"os","label":"Operating system","type":"select","options":["Windows 11 Pro","Windows 11 Home","Windows 10 Pro","macOS","Linux","ChromeOS","None"]},
  {"key":"os_license_included","label":"OS licence included","type":"boolean"},
  {"key":"keyboard_layout","label":"Keyboard layout","type":"select","options":["QWERTZ (DE)","QWERTY (US)","QWERTY (UK)","AZERTY (FR)","Other"]},
  {"key":"battery_cycles","label":"Battery cycle count","type":"number"},
  {"key":"charger_included","label":"Charger included","type":"boolean"},
  {"key":"serial_numbers_available","label":"Serial numbers on request","type":"boolean"}
]'::jsonb),

('desktops', 'Desktop PCs', 'cpu', 20, '[
  {"key":"cpu","label":"Processor","type":"text","required":true},
  {"key":"ram_gb","label":"RAM","type":"number","unit":"GB","required":true},
  {"key":"storage_gb","label":"Storage","type":"number","unit":"GB","required":true},
  {"key":"storage_type","label":"Storage type","type":"select","options":["NVMe SSD","SATA SSD","HDD"]},
  {"key":"gpu","label":"Graphics","type":"text"},
  {"key":"form_factor","label":"Form factor","type":"select","options":["Tower","Small form factor","Mini PC","All-in-one","Workstation"]},
  {"key":"os","label":"Operating system","type":"select","options":["Windows 11 Pro","Windows 10 Pro","macOS","Linux","None"]},
  {"key":"os_license_included","label":"OS licence included","type":"boolean"},
  {"key":"wifi","label":"Wi-Fi","type":"boolean"}
]'::jsonb),

('monitors', 'Monitors', 'monitor', 30, '[
  {"key":"screen_inches","label":"Screen size","type":"number","unit":"in","required":true},
  {"key":"resolution","label":"Resolution","type":"select","options":["1920x1080","1920x1200","2560x1080","2560x1440","3440x1440","3840x2160","5120x2880","Other"],"required":true},
  {"key":"panel_type","label":"Panel type","type":"select","options":["IPS","VA","TN","OLED"]},
  {"key":"refresh_hz","label":"Refresh rate","type":"number","unit":"Hz"},
  {"key":"ports","label":"Ports","type":"multiselect","options":["HDMI","DisplayPort","USB-C","VGA","DVI","USB hub"]},
  {"key":"usb_c_power_w","label":"USB-C power delivery","type":"number","unit":"W"},
  {"key":"height_adjustable","label":"Height-adjustable stand","type":"boolean"},
  {"key":"stand_included","label":"Stand included","type":"boolean"},
  {"key":"vesa_mount","label":"VESA mount","type":"boolean"},
  {"key":"speakers","label":"Built-in speakers","type":"boolean"},
  {"key":"dead_pixels","label":"Dead pixels","type":"number"}
]'::jsonb),

('keyboards', 'Keyboards', 'keyboard', 40, '[
  {"key":"layout","label":"Layout","type":"select","options":["QWERTZ (DE)","QWERTY (US)","QWERTY (UK)","AZERTY (FR)","Other"],"required":true},
  {"key":"connection","label":"Connection","type":"select","options":["USB wired","Wireless (dongle)","Bluetooth","Bluetooth + dongle"]},
  {"key":"keyboard_type","label":"Type","type":"select","options":["Membrane","Mechanical","Scissor"]},
  {"key":"size","label":"Size","type":"select","options":["Full size","TKL","75%","65%","60%"]},
  {"key":"numpad","label":"Numpad","type":"boolean"},
  {"key":"backlit","label":"Backlit","type":"boolean"},
  {"key":"receiver_included","label":"Receiver included","type":"boolean"}
]'::jsonb),

('mice', 'Mice', 'mouse', 50, '[
  {"key":"connection","label":"Connection","type":"select","options":["USB wired","Wireless (dongle)","Bluetooth","Bluetooth + dongle"],"required":true},
  {"key":"ergonomic","label":"Ergonomic / vertical","type":"boolean"},
  {"key":"rechargeable","label":"Rechargeable","type":"boolean"},
  {"key":"receiver_included","label":"Receiver included","type":"boolean"}
]'::jsonb),

('docking-stations', 'Docking stations', 'plug', 60, '[
  {"key":"connection","label":"Host connection","type":"select","options":["USB-C","Thunderbolt 3","Thunderbolt 4","USB-A","Proprietary"],"required":true},
  {"key":"power_delivery_w","label":"Power delivery","type":"number","unit":"W"},
  {"key":"display_outputs","label":"Display outputs","type":"number"},
  {"key":"ports","label":"Ports","type":"multiselect","options":["HDMI","DisplayPort","USB-A","USB-C","Ethernet","Audio","SD card"]},
  {"key":"power_adapter_included","label":"Power adapter included","type":"boolean"},
  {"key":"compatible_with","label":"Compatible with","type":"text","placeholder":"Dell Latitude, Lenovo ThinkPad…"}
]'::jsonb),

('tablets', 'Tablets', 'tablet', 70, '[
  {"key":"storage_gb","label":"Storage","type":"number","unit":"GB","required":true},
  {"key":"screen_inches","label":"Screen size","type":"number","unit":"in"},
  {"key":"cellular","label":"Cellular (LTE/5G)","type":"boolean"},
  {"key":"os","label":"Operating system","type":"select","options":["iPadOS","Android","Windows"]},
  {"key":"mdm_removed","label":"Removed from MDM / activation lock","type":"boolean","required":true},
  {"key":"stylus_included","label":"Stylus included","type":"boolean"},
  {"key":"keyboard_included","label":"Keyboard cover included","type":"boolean"}
]'::jsonb),

('smartphones', 'Smartphones', 'smartphone', 80, '[
  {"key":"storage_gb","label":"Storage","type":"number","unit":"GB","required":true},
  {"key":"os","label":"Operating system","type":"select","options":["iOS","Android"]},
  {"key":"carrier_unlocked","label":"SIM unlocked","type":"boolean"},
  {"key":"mdm_removed","label":"Removed from MDM / activation lock","type":"boolean","required":true},
  {"key":"dual_sim","label":"Dual SIM / eSIM","type":"boolean"}
]'::jsonb),

('headsets', 'Headsets & audio', 'headphones', 90, '[
  {"key":"connection","label":"Connection","type":"select","options":["USB","USB-C","3.5 mm","Bluetooth","DECT"]},
  {"key":"noise_cancelling","label":"Active noise cancelling","type":"boolean"},
  {"key":"teams_certified","label":"Teams / Zoom certified","type":"boolean"},
  {"key":"form","label":"Form","type":"select","options":["Over-ear","On-ear","In-ear","Speakerphone"]},
  {"key":"ear_pads_replaced","label":"Ear pads replaced","type":"boolean"}
]'::jsonb),

('webcams', 'Webcams & conferencing', 'video', 100, '[
  {"key":"resolution","label":"Resolution","type":"select","options":["720p","1080p","4K"]},
  {"key":"device_type","label":"Type","type":"select","options":["Webcam","Conference camera","Video bar","Speakerphone"]},
  {"key":"connection","label":"Connection","type":"select","options":["USB-A","USB-C","HDMI","Network"]}
]'::jsonb),

('networking', 'Networking', 'network', 110, '[
  {"key":"device_type","label":"Device","type":"select","options":["Switch","Router","Access point","Firewall","Modem","NAS"],"required":true},
  {"key":"ports","label":"Number of ports","type":"number"},
  {"key":"speed","label":"Max speed","type":"select","options":["100 Mbit","1 Gbit","2.5 Gbit","10 Gbit"]},
  {"key":"poe","label":"PoE","type":"boolean"},
  {"key":"managed","label":"Managed","type":"boolean"},
  {"key":"factory_reset","label":"Factory reset done","type":"boolean","required":true}
]'::jsonb),

('printers', 'Printers & scanners', 'printer', 120, '[
  {"key":"device_type","label":"Type","type":"select","options":["Laser printer","Inkjet printer","Multifunction","Scanner","Label printer"],"required":true},
  {"key":"color","label":"Colour","type":"boolean"},
  {"key":"duplex","label":"Duplex","type":"boolean"},
  {"key":"page_count","label":"Total page count","type":"number"},
  {"key":"toner_included","label":"Toner / ink included","type":"boolean"}
]'::jsonb),

('accessories', 'Accessories & other', 'package', 200, '[
  {"key":"item_type","label":"Item type","type":"text","placeholder":"Laptop stand, cable, charger…","required":true}
]'::jsonb)

on conflict (slug) do update
  set name = excluded.name,
      icon = excluded.icon,
      sort_order = excluded.sort_order,
      spec_schema = excluded.spec_schema;
