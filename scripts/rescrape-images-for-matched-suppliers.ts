// Image-only rescrape for a targeted list of high-value suppliers.
// Run: npx tsx scripts/rescrape-images-for-matched-suppliers.ts
//      npx tsx scripts/rescrape-images-for-matched-suppliers.ts --limit 5

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { appendFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { scrapeSupplier } from "../lib/scraper/firecrawlPipeline";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const LOG_PATH = resolve(process.cwd(), "scripts/rescrape-images.log");
const SUPPLIER_DELAY_MS = 2000;

// ─── Hardcoded list of high-value matched-supplier IDs (paste the 259 here) ──
const SUPPLIER_IDS: string[] = [
  "000ea5e8-3ee0-4815-9d2f-92ae6126e7a6",
  "01f5be2e-90d0-4734-81f3-cae07e448fc1",
  "027a5c19-59fe-42be-865d-6c041a4d3583",
  "03f204d2-014a-4a97-9e0f-003b840dc93d",
  "040e0dc2-5c84-49e9-a494-b47a7b6ec4fa",
  "043ddb27-e693-417a-ba3c-1a608f80ad24",
  "04686031-8ae6-49eb-84aa-48e31e968bab",
  "066b8d1d-7688-4444-8d9b-a006980d25c0",
  "07b92316-dd27-4e01-9bbe-f2ea98fd7f2f",
  "08a6b03e-f761-4c42-9d72-fb812360efa2",
  "0b3759a2-4ed0-4672-8885-b4e59343b735",
  "0cc18983-f57f-4a33-bfbb-310c3ff74da8",
  "0d37b11b-046b-4002-8f10-89d4b61cf807",
  "0d3ff196-8b69-4626-be46-715e21431807",
  "0e80d387-4262-4a02-a1b9-4957c1343abe",
  "0eb117c1-ee76-4768-8541-21e2ae7cf702",
  "0f1a987c-404b-4015-b04f-53d3d401abb0",
  "10125cf8-a376-4500-8350-df0f8c14b8f7",
  "1057d8b2-4c7e-4014-a279-5c714dc9f8be",
  "1197f44f-e950-4b50-b9e3-c08ad9ea2843",
  "12034fdb-b208-49f6-be80-f5b883c2ac33",
  "120389cd-c3aa-4f94-9c40-cca1736f5552",
  "12436fc1-c07f-481b-ac17-c4a73e996ab2",
  "132080a5-aa0d-4ece-8cd1-c33fbe103873",
  "14e2afb9-0c4f-4717-a0ed-1d08bc40c57f",
  "150ce9f8-77ad-49a5-9783-27e129a22340",
  "1561ae15-aeac-4f3c-a8e4-4f074cf742f1",
  "15ca9981-b6d1-4244-acb9-2f033401ccac",
  "177400ba-4e08-4add-9bb8-689a159ef8a2",
  "18a5ae36-6159-4caa-9fff-a3f6289b9758",
  "1937b869-2876-4005-a300-e7f2478c9099",
  "19bfd736-a747-4454-9e6a-ee845e00a283",
  "19dc03cc-3356-4aa6-84ee-3fc1ce031f9b",
  "1d340e38-2a95-4055-b3ed-f18aeb6a7e2f",
  "1d7ad2d1-6e95-41f7-9dfe-c5ffba6c3e92",
  "1d7c4587-de56-4639-94b3-c5494118e4d7",
  "1e97c3db-1da7-4107-b52b-81491d88b136",
  "1f1ee63f-53f4-4b23-9e36-33d4bd67fce7",
  "210421a7-a33c-4090-947b-ac3799f45972",
  "2317b739-61a9-467b-9a89-486af67444cc",
  "27c08cc7-5bad-4916-aec1-9dcd43abe90b",
  "286bf1d6-3cdd-4d65-9a05-fd7db6f2cf1d",
  "2b8b169e-83c7-4aba-a593-1b329fd30625",
  "2cef8282-7132-4604-aac2-bc2dbf0a5351",
  "2e37b168-fd14-4f43-adf9-fb1bc674e4ba",
  "2ee0de38-fa62-4437-8b6a-507938d6e31a",
  "3038883e-cfc7-4692-aaab-c3e5947df81a",
  "31608e91-afa5-46c0-b5f4-1edfb4bea4eb",
  "33e6434e-6190-4dcf-aef3-0815b9c07c27",
  "34a938d0-b330-4545-aa0d-8bcf8e4c1586",
  "35e74de0-568f-4616-bf6c-ba1abdb68207",
  "3ad23744-c70b-4a2c-b01a-842438d6c62c",
  "3adaf16d-a4ac-489d-be3b-6fb0fd9bb6e6",
  "3bc85043-d304-426c-b519-db95fe3211ef",
  "3d528716-205b-4dc4-8310-bba1e39c5d3f",
  "3d673eb3-62a9-4039-a651-ae6bf87e864a",
  "3f4a0cae-efc8-4df6-945d-e91d111c430c",
  "3fddf2b8-7de9-44fa-94d3-694f26a47f27",
  "4055d398-4518-4049-8533-e84e059ca599",
  "41764677-4123-430d-b65f-f8cf23782a14",
  "42905644-f817-46c2-8b4f-7a69c85a2bcd",
  "42dc1f1e-3157-4ae4-97d7-9a59f22e13c6",
  "45446039-33ce-4625-a819-6009b1bb7248",
  "45a3ea51-eb81-438e-a4a7-3c658c86c37c",
  "47de66f8-f404-41a9-b8fa-d3e794f58fe3",
  "482077a2-06ee-415d-b2bd-c2d9521ad6dc",
  "4a7d5a74-d0c3-454f-8c8d-9e8e4c04b9c2",
  "4a94b2b4-cc4e-4ff4-8f39-8cf437d5bcaf",
  "4aaa1625-ca2c-4e4f-8a60-7fc0b66115f2",
  "4b53aa92-89f1-4ce1-b5f1-cda110a44ad0",
  "4be2314a-2969-4270-9375-6540719cf8a2",
  "4c9a0dd7-480a-4502-93b2-98226781cf3d",
  "4d0a58eb-3f14-4f1b-9f81-708e139b528b",
  "4da18797-d070-4aa4-9c47-3ccedd0f5dfb",
  "4da75d72-8213-43bb-a411-c42fc755c2eb",
  "4f17ceda-b38b-42be-916e-da821b4d67cf",
  "4f6cdf03-b428-42cf-9974-5125b04890ae",
  "4f9f82cc-4485-4a29-bf70-dcda0924ceff",
  "51b3aee3-89bd-436a-9552-cbb44a650b3e",
  "51f1cede-b94b-4c48-aaa2-4de6342733e8",
  "526ed474-5bbc-4f48-809f-1a61665eb739",
  "528b7fbb-9803-4cc8-902a-2fc7e6dff86d",
  "53d9e8c0-3755-492e-8d25-09d87bf097e4",
  "5592a8ad-72d1-4dc9-bf8e-ace4c81050a7",
  "56fbba77-5b62-4320-a946-358661860502",
  "573d6790-c5ec-430d-a9dd-fe3031d31a71",
  "57888ab8-3f9a-4e59-a99d-f21ace144d23",
  "58355f9e-33e3-457e-98e1-919073776ef3",
  "58b99a33-b204-4f30-bc49-20e939bd44be",
  "5a2fb6c8-be7c-415e-a337-e0635676d74c",
  "5bdb1cb7-9133-4c99-89db-c0dcbc1e3c68",
  "5c2240e0-3c6d-487b-b0ac-5a0d3adb108a",
  "5c3dd284-1aac-4ae3-affc-37c1faeb9d0d",
  "5c8f2754-be5e-4e3a-9b80-c78babac795c",
  "5cdc6dec-cc60-41a5-a340-07b8fa293b4b",
  "5e943d9c-e750-4b40-ac9f-3ded56dfca46",
  "5ebcc274-983b-4630-9f8f-24b35a6c37ef",
  "5f3e8388-0cbc-441e-bb02-6422dd8875c9",
  "5f57ea92-fade-401a-9ac5-dd6202fa9ebb",
  "6069f3c5-2979-43e1-8f18-12e35df886c7",
  "615dba33-dc1a-402e-a6e2-78c4023a559a",
  "61c105c3-cbad-496b-82ee-6df43d37468e",
  "6213ec68-5770-443e-91d2-ee05c796cd42",
  "648a1e65-a503-4f39-9c59-086ae1bde97c",
  "6506f380-3403-44d9-a425-2f7cd9667adf",
  "6859635e-193a-4dd7-9cf8-b1c388a8f60a",
  "68b497b0-ffeb-4e69-b2b9-5f79f0d9398c",
  "6934a26d-d963-4617-8464-28375cb030a0",
  "6a7664fa-da7c-4fca-aee6-fda628729200",
  "6b514b8f-0048-4057-bd52-bff8b6366d02",
  "6cbe72ee-6841-41a4-b5ff-ca173b5284c9",
  "6cef6b9b-7cc6-47da-88db-23525336eb8f",
  "6cf6b80a-c4ef-42e0-b6c0-029b7df411f4",
  "6f5c8b6e-c8dd-4dcd-8f19-fb56fddf6ea4",
  "71e20563-2f28-4e7a-bdce-73fe65481888",
  "71f5debd-c5d1-48d2-8021-8649296d9c70",
  "72f87091-8ae3-4393-b9cf-8e741598e9c7",
  "74b16b5c-0a9a-4a32-ae50-7d1c18008254",
  "74ccbab4-84bc-4b32-abab-6520b51f5229",
  "774d2bb4-b246-4660-8a1a-93bfc3c4556c",
  "77c5f994-95bc-4f41-8f2c-0c3e124926e1",
  "7a08b378-7d20-487f-b84e-801dd740ad20",
  "7abb0c5a-e535-4037-9e11-fafb68601556",
  "7c2bf0e4-247c-4d6b-ba28-eb79e8978388",
  "7c712a3d-e423-4c57-afa5-a625bd9bb438",
  "7c929a89-afbe-4798-ba91-0873d0023335",
  "7cf6d9b5-f3c9-4edb-9cbc-da4e4272942a",
  "7df2a053-ee56-4a87-948b-95fd20542752",
  "7e1a575a-24e6-4f34-9b4d-239db50b9b2c",
  "7f43f263-aede-4496-88dd-c5acb813e340",
  "7f980f22-fc1d-4bae-9e50-f1f65372bdf1",
  "7fd902bd-6a9f-4f03-9b13-9a3c7be81f83",
  "80c6d32f-4861-438f-8afd-2e5496471243",
  "817104fb-f1d5-4f4c-89f9-2f354307599d",
  "83825e18-7cf3-43c9-96b3-04e04f628962",
  "8455ab55-a4d7-4bf1-8a57-b9a69064f3eb",
  "8472c4a4-f833-44b0-9456-8791e3089555",
  "858036ec-592b-428f-82ae-deb173ba8fca",
  "858ccc31-da66-4848-a5fc-d3aac251c8fa",
  "85e448c3-16ea-4993-b86c-f23eca76e6e8",
  "874e5e24-46cd-4ab4-a105-c8e9f60ec2d1",
  "87888ac0-f090-48b2-8527-fca8bd9ac299",
  "87935a8a-3e81-4a49-bab8-e32a224ae836",
  "879eef39-8371-4c63-bb7f-d0f8ddaae8f8",
  "87d7b382-8ca6-4374-85e8-f1cb94b64f5e",
  "89a6b3f0-cfa8-410a-b949-fe9acb068782",
  "8d394401-e37e-44a5-921c-6493846e7eeb",
  "8dedd547-b764-43ce-bae3-4bb2e83bfb5a",
  "907c471f-7a6d-46a9-8698-455f9469eb24",
  "917a9b75-024b-4d5d-a1be-9a6b77464624",
  "91a5433f-a305-45eb-8a8f-9247a9b86cd9",
  "92440ca1-5a71-4121-a91e-0ba692d6eb68",
  "9303c84d-ad14-4659-be4f-788a8dbf96c7",
  "93c417b8-caa7-408a-8e61-393aee21b257",
  "93ec0d74-c163-4d80-ba52-2f8575c82153",
  "95239990-c9da-4e4e-8b17-502194f3aa78",
  "95416278-c179-4979-9f8c-0bc3bb2888de",
  "97e38fca-70ef-4f6b-8bc9-9ff380b81faf",
  "99356f9b-4ecd-42c0-b5f1-d5b195393939",
  "99390819-46dd-4813-9604-6fc17b313ed4",
  "9c72a51d-b802-49a3-a080-277c0ad0a749",
  "9ffcbd00-76d5-4c3a-9b9b-c49c4e60eace",
  "a0487347-6ab2-480e-af04-09df6eac0c41",
  "a081a14a-33dc-4948-87b8-bb2ed010b235",
  "a09c0327-dd58-4a05-90f0-f0b30ce91648",
  "a1430e0a-cbad-40f0-82b6-d5c5e37136f1",
  "a16e040f-5aa6-44cd-ac12-c09737db25e2",
  "a1952990-113d-4321-8b19-981c301fd27c",
  "a28a6fd7-5c33-4b20-802f-35eeafb2c8c9",
  "a504d170-6678-4012-820b-c908acdad8e3",
  "a70c5210-391b-4628-a411-0fda09ee5733",
  "a74351fa-dc12-4bd0-b769-12bda17e1b00",
  "a7edcd8f-d6e9-42d4-a5bc-e6b74ca59e8f",
  "a82b52f9-4451-4aba-9b85-ef0e9a02989e",
  "a92068b8-659c-4bd1-ba95-a161f50b3b96",
  "a9317019-4dca-44d6-9e03-0a558b2354ba",
  "a9877839-cc09-43ab-8ed2-668b27f9480a",
  "aaf2a4bd-f5ae-4394-9469-acebc4f5946c",
  "ab5ee564-a998-47cd-968e-d2dab2afe354",
  "ab63b81b-5aa4-459d-afa9-869c081130bd",
  "ac233137-2056-4fbe-8a51-27f0e47f5c40",
  "ac262fea-1d37-461a-bbbb-1567eef5b333",
  "ae26742a-d64a-4ea9-8bc8-5054ce8fd666",
  "b1686345-0ed0-4076-b85e-8c04d06eaf52",
  "b1aa5b6e-0683-4430-9ed8-a6257b1f4026",
  "b23f3f3e-8309-4691-b674-96a56b61e4c4",
  "b2dea8ef-170b-45fe-a3a8-7d0fbeb4bfd0",
  "b43f51c0-e27d-4615-a00e-7969a175ceb2",
  "b6581d13-7c92-4f33-8462-799a1eb2f12a",
  "bcc7da6f-51ae-47d9-8e3a-21079005717d",
  "be9eac21-14c0-43d6-9c90-88c7017bba06",
  "bf91a7f2-f085-4f66-87b2-eddb97d4c8cd",
  "bffbcd91-d2a4-4171-a1b3-5a7e7a187027",
  "c02a4bf2-e569-4d35-a69a-a39c5b6fff1b",
  "c3f297bb-936c-4a21-bc69-e301b0527047",
  "c45d95c5-0577-4a8e-8f3e-65d2a8795e31",
  "c525b57e-4ed4-4349-8beb-359221adc10b",
  "c6ed8dae-2912-4014-b9ca-84c15e803ddb",
  "c73b78e1-aa97-4ac6-b31c-75807f606083",
  "c7bc1c86-b187-43e4-93c6-c34754149b5f",
  "c7bee031-d7f4-414b-aafc-30d48c70e392",
  "cb01b856-caf5-4460-a51a-111402d918c4",
  "cb500539-7f7d-41e7-b38f-05c9083964d9",
  "cbe4dbf9-67fa-4ff9-9899-28feb656e316",
  "cbf0e8c8-85ad-4c33-8f5d-092827128fe5",
  "cbfc5dde-04de-4cb5-a46b-1cb19b571dd1",
  "cc2b9c40-3ea4-4e75-8325-e5c0090cc89f",
  "cc821a04-8bfc-4f37-9e6b-5f373973e9b6",
  "ce8cf569-e8d8-4419-afad-824adfd78f43",
  "cf10ea37-af27-46b5-9918-80eab424e107",
  "d1b1d708-d82a-4018-8b95-858128231267",
  "d1e33eaf-03c7-48c2-8bad-d3304bb3ccd5",
  "d3bda361-d22e-4c89-b918-f9b2aaadf175",
  "d5021a99-6bfc-4428-9d2a-069d5c655d96",
  "d5ee7134-985f-41fc-9a10-d7efeb10aeb8",
  "d7529269-289f-440e-aa96-74e4e0dac32a",
  "d7f7fc99-271d-4716-80d6-3a4d64393091",
  "d82dc3cc-0d37-4c50-b69c-ed12bcbe3fec",
  "d8589dd1-9c14-42fe-b3cb-ec8ce91f0b88",
  "d884d6e0-b8d2-4eb6-ae1b-0b052295861a",
  "d93b06b7-aad9-464d-9b95-43605ef44b22",
  "da586bf2-069a-4b90-87db-f31375abc5c2",
  "dadbba7c-ffcc-4fc4-b53e-f43aface203b",
  "dbbb4bc8-e5f1-46f8-b663-ecabcda4b30f",
  "dbf489fa-e36b-4c58-9ba0-c13a01ead1c9",
  "dc2307af-bd42-494b-9026-969d0357a825",
  "dd10ff06-f46e-4d6b-a3b3-fe5db26c8d1f",
  "de68d3d4-4296-466d-947a-ffd46f9074d4",
  "e07f444c-9585-479d-b72d-33563a989fe6",
  "e0814977-dff9-4ee2-add3-ad46b696017e",
  "e14de82b-5666-4735-8a47-fce6fddea7fb",
  "e223a1aa-a15d-4447-b9dd-bfa405c51592",
  "e29b8282-eb08-4635-a283-2b59791dba3d",
  "e2a9d9f5-8d87-4949-906a-155987f9d8d4",
  "e33915c3-551d-47b5-a74b-b39f41538d87",
  "e4e0905b-ce3e-4ae1-9d5b-50828681e4e3",
  "e59610af-3e60-417e-ae7c-bdd3b17c6afa",
  "e7f1abd8-da4c-4658-a07a-3abb4d87ea98",
  "e920e353-3d17-4660-927d-896ef0d7362a",
  "e9b48526-77bd-4f49-8e6a-57732c4d0744",
  "e9e47abf-c3e1-4bc8-813f-0477ab32b95f",
  "ea33e53d-c9d8-41d0-9bb1-63072eca4e21",
  "eae3dfdd-f98a-4ebb-a46c-70b123e01ec1",
  "ed93e74f-9d29-4399-b75f-02b01ecaeef4",
  "edb8d31f-44a0-43a0-82e0-2a04654b2b0e",
  "ee9ad52c-1964-40b4-abf6-600f1554c4bf",
  "ef824e55-4d84-4642-905e-920a8071cf5c",
  "f1170451-24c0-42ee-8971-4f881a13f48a",
  "f2548360-2ae0-44c7-a7fe-a837055d4e71",
  "f488525c-19a6-43d9-bad9-ed4161d00599",
  "f4ad2b0a-5dd9-4872-a90a-6179d2852031",
  "f5830b73-c708-422d-8c1b-5661e9bf096a",
  "f6eb2ca9-c041-4fa4-a828-7dc162c819e7",
  "f9916a63-8df8-4ae7-ace6-974905b3cb21",
  "fa23b80e-f75b-4d50-924c-f03e96d6dad3",
  "faff37d3-02c8-4823-974a-2924167caf3b",
  "fd9c8f97-f2ee-4473-815f-cd3f8a7e641f",
  "fe388a42-ebea-4d45-bfc0-5901b8f0ef91",
  "ff1918b7-2b10-4f14-9ab8-8b0f13342e1a"
];

function parseLimit(): number | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--limit" && args[i + 1]) {
      const n = parseInt(args[i + 1], 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }
    if (args[i].startsWith("--limit=")) {
      const n = parseInt(args[i].slice(8), 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }
  }
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function getHomepage(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
}

function log(line: string): void {
  console.log(line);
  try {
    appendFileSync(LOG_PATH, line + "\n");
  } catch {
    // best-effort — don't fail the run over a log write error
  }
}

type SupplierRow = {
  id: string;
  company_name: string;
  website: string | null;
};

type ExistingProduct = {
  id: string;
  product_name: string;
  image_url: string | null;
};

async function fetchSupplier(id: string): Promise<SupplierRow | null> {
  const { data, error } = await supabase
    .from("supplier_offerings")
    .select("id, company_name, website")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as SupplierRow;
}

async function fetchExistingProducts(supplierId: string): Promise<ExistingProduct[]> {
  const { data, error } = await supabase
    .from("supplier_products")
    .select("id, product_name, image_url")
    .eq("supplier_id", supplierId);
  if (error || !data) return [];
  return data as ExistingProduct[];
}

async function main() {
  const limit = parseLimit();
  const ids = limit ? SUPPLIER_IDS.slice(0, limit) : SUPPLIER_IDS;

  log(
    `\n=== Rescrape run started ${new Date().toISOString()} — ${ids.length} supplier(s)${
      limit ? ` (--limit ${limit})` : ""
    } ===`
  );

  let suppliersProcessed = 0;
  let totalImagesAdded = 0;
  const errored: { id: string; name: string; reason: string }[] = [];

  for (let i = 0; i < ids.length; i += 1) {
    const supplierId = ids[i];
    const prefix = `[${i + 1}/${ids.length}]`;

    try {
      const supplier = await fetchSupplier(supplierId);
      if (!supplier) {
        log(`${prefix} ${supplierId}: SKIPPED — supplier not found`);
        errored.push({ id: supplierId, name: supplierId, reason: "Supplier not found" });
        continue;
      }
      if (!supplier.website) {
        log(`${prefix} ${supplier.company_name}: SKIPPED — no website`);
        errored.push({ id: supplierId, name: supplier.company_name, reason: "No website" });
        continue;
      }

      const crawlUrl = getHomepage(supplier.website);
      const result = await scrapeSupplier(supplierId, crawlUrl);

      // Index existing DB products by normalized name — matching only, never inserting.
      const existingByName = new Map<string, ExistingProduct[]>();
      for (const p of await fetchExistingProducts(supplierId)) {
        const key = normalizeName(p.product_name);
        const bucket = existingByName.get(key) ?? [];
        bucket.push(p);
        existingByName.set(key, bucket);
      }

      let matched = 0;
      let updated = 0;

      for (const pageProduct of result.products) {
        const key = normalizeName(pageProduct.product.product_name);
        const candidates = existingByName.get(key);
        if (!candidates || candidates.length === 0) continue; // no exact name match — skip, never insert
        matched += 1;

        if (!pageProduct.image_url) continue;

        for (const existingProduct of candidates) {
          if (existingProduct.image_url) continue; // already has an image — idempotent skip

          const { error: updateError } = await supabase
            .from("supplier_products")
            .update({ image_url: pageProduct.image_url, image_source: pageProduct.image_source })
            .eq("id", existingProduct.id)
            .is("image_url", null);

          if (updateError) {
            log(
              `  [ERROR] ${supplier.company_name} — failed to update product ${existingProduct.id}: ${updateError.message}`
            );
            continue;
          }
          updated += 1;
        }
      }

      suppliersProcessed += 1;
      totalImagesAdded += updated;
      log(
        `${prefix} ${supplier.company_name}: scraped ${result.pagesScraped} pages, matched ${matched} products, updated ${updated} images`
      );
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      errored.push({ id: supplierId, name: supplierId, reason });
      log(`${prefix} ${supplierId}: ERROR — ${reason}`);
    }

    if (i + 1 < ids.length) {
      await sleep(SUPPLIER_DELAY_MS);
    }
  }

  log(`\n=== Summary ===`);
  log(`Suppliers processed: ${suppliersProcessed}/${ids.length}`);
  log(`Total images added: ${totalImagesAdded}`);
  log(`Suppliers errored: ${errored.length}`);
  for (const e of errored) {
    log(`  - ${e.name} (${e.id}): ${e.reason}`);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
