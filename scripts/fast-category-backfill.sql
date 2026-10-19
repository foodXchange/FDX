-- Bulk category backfill for supplier_products based on canonical 21-leaf taxonomy
UPDATE supplier_products 
SET category_id = '2b5f3c21-1770-4da3-b0ec-6147ffbcc8c7' 
WHERE category_id IS NULL AND category ILIKE '%Tomato Products%';

UPDATE supplier_products 
SET category_id = 'ff746938-df89-47ad-9551-b174340c7ce1' 
WHERE category_id IS NULL AND (category ILIKE '%Pasta & Grains%' OR category ILIKE '%Pasta/Noodles%' OR category ILIKE '%Pasta & Noodles%');

UPDATE supplier_products 
SET category_id = '8660789d-00a3-49d2-8489-6b42f2345b7a' 
WHERE category_id IS NULL AND (category ILIKE '%Bakery%' OR category ILIKE '%Bakery & Bread%');

UPDATE supplier_products 
SET category_id = 'ab9f8022-0f59-4d96-883d-19367680461f' 
WHERE category_id IS NULL AND (category ILIKE '%Dairy%' OR category ILIKE '%Dairy Products%');

UPDATE supplier_products 
SET category_id = '965a483d-eacc-4426-ae7c-cf0552e65250' 
WHERE category_id IS NULL AND (category ILIKE '%Fish & Seafood%' OR category ILIKE '%Seafood%');

UPDATE supplier_products 
SET category_id = '6b051f68-90c2-4ba4-9535-f678cd268cf8' 
WHERE category_id IS NULL AND (category ILIKE '%Canned Foods%' OR category ILIKE '%Canned Goods%' OR category ILIKE '%Canned & Preserved%');

UPDATE supplier_products 
SET category_id = 'c49e821f-fff8-4ac1-af10-c6db4c8564ab' 
WHERE category_id IS NULL AND (category ILIKE '%Frozen Foods%' OR category ILIKE '%Prepared Meals%');

UPDATE supplier_products 
SET category_id = '85998961-842d-4171-9198-07f8a7409b9d' 
WHERE category_id IS NULL AND (category ILIKE '%Oils & Fats%' OR category ILIKE '%Fats, Oils%');

UPDATE supplier_products 
SET category_id = '32eace2c-ac37-4168-b93b-005748119293' 
WHERE category_id IS NULL AND category ILIKE '%Beverages%';

UPDATE supplier_products 
SET category_id = '24768201-755e-4560-b283-46cbbabcd27b' 
WHERE category_id IS NULL AND (category ILIKE '%Sauces & Condiments%' OR category ILIKE '%Specialty Sauces%');

UPDATE supplier_products 
SET category_id = '8899bfa4-1ca9-451b-8fdb-242231a6d2f0' 
WHERE category_id IS NULL AND (category ILIKE '%Spices & Herbs%' OR category ILIKE '%Spices & Seasonings%' OR category ILIKE '%Herbs%');

UPDATE supplier_products 
SET category_id = 'bd1da832-15dd-4186-b365-3e26b38bbdbe' 
WHERE category_id IS NULL AND (category ILIKE '%Pulses & Legumes%' OR category ILIKE '%Canned Vegetables & Pulses%');

UPDATE supplier_products 
SET category_id = '0a8f2c3c-b4ed-4759-849d-a545cdf551a2' 
WHERE category_id IS NULL AND (category ILIKE '%Ingredients & Additives%' OR category ILIKE '%Baking Ingredients%');

UPDATE supplier_products 
SET category_id = 'baf81f58-194d-4810-9367-152fac1349bf' 
WHERE category_id IS NULL AND (category ILIKE '%Honey & Sweeteners%' OR category ILIKE '%Sugars & Sweeteners%');

UPDATE supplier_products 
SET category_id = 'bfa873d3-4bb3-4c8e-945a-a38d4ad9d66f' 
WHERE category_id IS NULL AND (category ILIKE '%Meat & Poultry%' OR category ILIKE '%Raw Meat%');

UPDATE supplier_products 
SET category_id = 'f20fccd2-3bbe-4b7d-9b01-6424ef184fba' 
WHERE category_id IS NULL AND (category ILIKE '%Snacks%' OR category ILIKE '%Savory Snacks%');

UPDATE supplier_products 
SET category_id = 'ff37e8ca-cb21-42c1-9955-7eb1f6132f06' 
WHERE category_id IS NULL AND category ILIKE '%Confectionery%';

UPDATE supplier_products 
SET category_id = '18f4fb10-0337-45c8-a9d3-d063052db846' 
WHERE category_id IS NULL AND (category ILIKE '%Organic & Natural%' OR category ILIKE '%Plant-Based%');
