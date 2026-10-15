-- Production-safe initial site settings only. Demo content is in seeds/demo.sql.
INSERT OR IGNORE INTO settings(key,value) VALUES
('site_name','Fieldnote'),('site_tagline','Stories for curious people'),('admin_email','editor@example.test'),
('default_seo_title','Fieldnote — Stories for curious people'),('default_seo_description','Illustrative reporting, ideas, and guides for curious people.'),('default_social_image',''),
('logo_url',''),('ads_enabled','false'),('ads_publisher',''),('ads_slot',''),('ads_placement','after_intro'),
('head_scripts_enabled','false'),('head_scripts_code',''),('body_start_code','');
