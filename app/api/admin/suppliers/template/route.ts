export async function GET() {
  const rows = [
    "company_name,website,country,categories,priority,contact_email,contact_whatsapp,contact_name,notes",
    'Steriltom S.r.l.,https://steriltom.com,Italy,Tomato Products,9,info@steriltom.com,+39 333 1234567,Marco Rossi,Priority tomato supplier',
    "La Doria S.p.A.,https://ladoria.it,Italy,Tomato Products,8,,,",
    "Jealsa Rianxeira,https://jealsa.com,Spain,Fish & Seafood,8,,,",
    ",,,,,,,,"
  ];

  return new Response(rows.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="fdx-supplier-template.csv"',
    },
  });
}
