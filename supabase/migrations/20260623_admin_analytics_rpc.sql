-- Function to compute admin analytics and intelligence metrics in a single sub-second query
CREATE OR REPLACE FUNCTION get_admin_intelligence_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    v_total_suppliers int;
    v_total_products int;
    v_potential_buyers int;
    v_manufacturers int;
    v_traders int;
    v_wholesalers int;
    v_importers int;
    v_non_food int;
    v_unclassified int;
    v_pl_products int;
    v_kosher_products int;
    v_with_email int;
    v_with_phone int;
    v_roles jsonb;
    v_sectors jsonb;
    v_categories jsonb;
    v_countries jsonb;
    v_continents jsonb;
    v_scrape_status jsonb;
BEGIN
    -- Suppliers high level counts
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE is_potential_buyer = true),
        COUNT(*) FILTER (WHERE business_role = 'manufacturer'),
        COUNT(*) FILTER (WHERE business_role = 'trader'),
        COUNT(*) FILTER (WHERE business_role = 'wholesaler'),
        COUNT(*) FILTER (WHERE business_role = 'importer'),
        COUNT(*) FILTER (WHERE sector IS NOT NULL AND sector NOT IN ('food_beverage', 'unclassified')),
        COUNT(*) FILTER (WHERE business_role IS NULL OR business_role = 'unclassified'),
        COUNT(*) FILTER (WHERE contact_email IS NOT NULL AND contact_email != ''),
        COUNT(*) FILTER (WHERE contact_phone IS NOT NULL AND contact_phone != '')
    INTO 
        v_total_suppliers,
        v_potential_buyers,
        v_manufacturers,
        v_traders,
        v_wholesalers,
        v_importers,
        v_non_food,
        v_unclassified,
        v_with_email,
        v_with_phone
    FROM supplier_offerings
    WHERE duplicate_of_supplier_id IS NULL;

    -- Products high level counts
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE private_label = true),
        COUNT(*) FILTER (WHERE 'Kosher' = ANY(certifications) OR array_length(kosher_types, 1) > 0)
    INTO 
        v_total_products,
        v_pl_products,
        v_kosher_products
    FROM supplier_products;

    -- Roles breakdown
    SELECT jsonb_agg(r ORDER BY (r->>'count')::int DESC)
    INTO v_roles
    FROM (
        SELECT jsonb_build_object(
            'role', COALESCE(business_role, 'unclassified'),
            'count', COUNT(*),
            'buyer_count', COUNT(*) FILTER (WHERE is_potential_buyer = true)
        ) as r
        FROM supplier_offerings
        WHERE duplicate_of_supplier_id IS NULL
        GROUP BY business_role
    ) sub;

    -- Sectors breakdown
    SELECT jsonb_agg(s ORDER BY (s->>'count')::int DESC)
    INTO v_sectors
    FROM (
        SELECT jsonb_build_object(
            'sector', COALESCE(sector, 'unclassified'),
            'count', COUNT(*),
            'buyer_count', COUNT(*) FILTER (WHERE is_potential_buyer = true)
        ) as s
        FROM supplier_offerings
        WHERE duplicate_of_supplier_id IS NULL
        GROUP BY sector
    ) sub;

    -- Top 25 Categories with PL and Kosher depth
    SELECT jsonb_agg(c ORDER BY (c->>'product_count')::int DESC)
    INTO v_categories
    FROM (
        SELECT jsonb_build_object(
            'category', COALESCE(sp.category, 'Uncategorized'),
            'product_count', COUNT(sp.id),
            'supplier_count', COUNT(DISTINCT sp.supplier_id),
            'private_label_count', COUNT(sp.id) FILTER (WHERE sp.private_label = true),
            'kosher_count', COUNT(sp.id) FILTER (WHERE 'Kosher' = ANY(sp.certifications) OR array_length(sp.kosher_types, 1) > 0)
        ) as c
        FROM supplier_products sp
        GROUP BY sp.category
        LIMIT 25
    ) sub;

    -- Countries breakdown (Top 30)
    SELECT jsonb_agg(co ORDER BY (co->>'count')::int DESC)
    INTO v_countries
    FROM (
        SELECT jsonb_build_object(
            'country', COALESCE(country_of_origin, 'Unknown'),
            'count', COUNT(*),
            'buyer_count', COUNT(*) FILTER (WHERE is_potential_buyer = true),
            'manufacturer_count', COUNT(*) FILTER (WHERE business_role = 'manufacturer')
        ) as co
        FROM supplier_offerings
        WHERE duplicate_of_supplier_id IS NULL
        GROUP BY country_of_origin
        LIMIT 30
    ) sub;

    -- Continents breakdown via subquery
    SELECT jsonb_agg(cont ORDER BY (cont->>'count')::int DESC)
    INTO v_continents
    FROM (
        SELECT jsonb_build_object(
            'continent', region,
            'count', COUNT(*),
            'buyer_count', COUNT(*) FILTER (WHERE is_potential_buyer = true)
        ) as cont
        FROM (
            SELECT 
                is_potential_buyer,
                CASE 
                    WHEN country_of_origin IN ('Italy', 'Spain', 'France', 'Germany', 'Greece', 'Portugal', 'Netherlands', 'Belgium', 'Austria', 'United Kingdom', 'Switzerland', 'Ireland', 'Denmark', 'Sweden', 'Norway', 'Finland') THEN 'Western Europe'
                    WHEN country_of_origin IN ('Poland', 'Bulgaria', 'Romania', 'Hungary', 'Czech Republic', 'Croatia', 'Serbia', 'Lithuania', 'Latvia', 'Estonia', 'Slovakia', 'Slovenia', 'Ukraine') THEN 'Eastern Europe'
                    WHEN country_of_origin IN ('United States', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru') THEN 'Americas'
                    WHEN country_of_origin IN ('Turkey', 'Israel', 'United Arab Emirates', 'Saudi Arabia', 'Jordan', 'Egypt', 'Lebanon') THEN 'Middle East'
                    WHEN country_of_origin IN ('China', 'India', 'Thailand', 'Vietnam', 'Japan', 'South Korea', 'Indonesia', 'Malaysia') THEN 'Asia Pacific'
                    ELSE 'Other Regions'
                END as region
            FROM supplier_offerings
            WHERE duplicate_of_supplier_id IS NULL
        ) reg
        GROUP BY region
    ) sub;

    -- Scrape status breakdown
    SELECT jsonb_agg(st)
    INTO v_scrape_status
    FROM (
        SELECT jsonb_build_object(
            'status', COALESCE(scrape_status, 'pending'),
            'count', COUNT(*)
        ) as st
        FROM supplier_offerings
        WHERE duplicate_of_supplier_id IS NULL
        GROUP BY scrape_status
    ) sub;

    result := jsonb_build_object(
        'overview', jsonb_build_object(
            'total_suppliers', v_total_suppliers,
            'total_products', v_total_products,
            'potential_buyers', v_potential_buyers,
            'manufacturers', v_manufacturers,
            'traders', v_traders,
            'wholesalers', v_wholesalers,
            'importers', v_importers,
            'non_food', v_non_food,
            'unclassified', v_unclassified,
            'private_label_products', v_pl_products,
            'kosher_products', v_kosher_products,
            'with_email', v_with_email,
            'with_phone', v_with_phone,
            'email_coverage_pct', CASE WHEN v_total_suppliers > 0 THEN ROUND((v_with_email::numeric / v_total_suppliers) * 100, 1) ELSE 0 END,
            'phone_coverage_pct', CASE WHEN v_total_suppliers > 0 THEN ROUND((v_with_phone::numeric / v_total_suppliers) * 100, 1) ELSE 0 END,
            'pl_ratio_pct', CASE WHEN v_total_products > 0 THEN ROUND((v_pl_products::numeric / v_total_products) * 100, 1) ELSE 0 END,
            'kosher_ratio_pct', CASE WHEN v_total_products > 0 THEN ROUND((v_kosher_products::numeric / v_total_products) * 100, 1) ELSE 0 END
        ),
        'roles', COALESCE(v_roles, '[]'::jsonb),
        'sectors', COALESCE(v_sectors, '[]'::jsonb),
        'categories', COALESCE(v_categories, '[]'::jsonb),
        'countries', COALESCE(v_countries, '[]'::jsonb),
        'continents', COALESCE(v_continents, '[]'::jsonb),
        'scrape_status', COALESCE(v_scrape_status, '[]'::jsonb)
    );

    RETURN result;
END;
$$;
