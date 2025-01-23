import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { GoogleAuth } from 'google-auth-library';

interface UserRegistration {
    [key: string]: string;
}

interface ResponseData<T = unknown> {
    ok: boolean;
    data?: T;
    error?: string;
}

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function loadGoogleDoc(): Promise<GoogleSpreadsheet> {
    const formattedKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SHEET_ID } = process.env;

    if (!formattedKey || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SHEET_ID) {
        throw new Error('Missing required environment variables for Google Sheets');
    }

    const auth = new GoogleAuth({
        credentials: {
            private_key: formattedKey,
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const authClient = await auth.getClient();
    const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, authClient);
    await doc.loadInfo();
    return doc;
}

async function getSheetData(doc: GoogleSpreadsheet, sheetTitle: string): Promise<Record<string, UserRegistration[]>> {
    const allData: Record<string, UserRegistration[]> = {};

    if (sheetTitle === '전체') {
        for (const sheet of doc.sheetsByIndex) {
            const rows = await sheet.getRows();
            const headers = sheet.headerValues.map((header) => header.trim());
            const sheetData: UserRegistration[] = rows.map((row) => {
                const rowData: UserRegistration = { 시트이름: sheet.title };
                headers.forEach((header) => {
                    rowData[header] = row.get(header) ? String(row.get(header)).trim() : '';
                });
                return rowData;
            });
            allData[sheet.title] = sheetData;
        }
    } else {
        const sheet = doc.sheetsByTitle[sheetTitle];
        if (!sheet) throw new Error(`Sheet with title "${sheetTitle}" not found.`);
        await sheet.loadHeaderRow();
        const rows = await sheet.getRows();
        const headers = sheet.headerValues.map((header) => header.trim());

        allData[sheet.title] = rows.map((row) => {
            const rowData: UserRegistration = { 시트이름: sheet.title };
            headers.forEach((header) => {
                rowData[header] = row.get(header) ? String(row.get(header)).trim() : '';
            });
            return rowData;
        });
    }

    return allData;
}

async function getCachedData<T>(sheetTitle: string, fetchFunction: () => Promise<T>): Promise<T> {
    const cacheKey = sheetTitle;
    const now = Date.now();
    const cached = cache.get(cacheKey);

    if (cached && now - cached.timestamp < CACHE_DURATION) {
        return cached.data as T;
    }

    console.log(`Fetching new data for key: ${cacheKey}`);
    try {
        const data = await fetchFunction();
        cache.set(cacheKey, { data, timestamp: now });
        return data;
    } catch (error) {
        console.error('Error fetching new data:', error);
        throw new Error('Failed to fetch new data');
    }
}

export default async function googleSheet(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
    if (req.method === 'GET') {
        try {
            const { sheet, name } = req.query;

            if (!sheet) {
                return res.status(400).json({ ok: false, error: 'Missing "sheet" query parameter' });
            }

            const doc = await loadGoogleDoc();
            const sheetName = String(sheet);

            const data = await getCachedData(sheetName, async () => {
                return getSheetData(doc, sheetName);
            });

            if (sheetName === '전체') {
                const allSheetData: Record<string, UserRegistration[]> = {};

                for (const sheetTitle in data) {
                    if (data[sheetTitle]) {
                        allSheetData[sheetTitle] = name
                            ? data[sheetTitle].filter((row: UserRegistration) => row['이름'] === String(name))
                            : data[sheetTitle];
                    }
                }

                return res.status(200).json({ ok: true, data: allSheetData });
            }

            if (!data || Object.keys(data).length === 0 || !data[sheetName]) {
                return res.status(404).json({ ok: false, error: `No data found for sheet: ${sheetName}` });
            }

            const filteredData = name
                ? data[sheetName]?.filter((row: UserRegistration) => row['이름'] === String(name))
                : data[sheetName];

            if (!filteredData || filteredData.length === 0) {
                return res.status(404).json({ ok: false, error: `No data found for name: ${name}` });
            }

            res.status(200).json({ ok: true, data: filteredData });
        } catch (error) {
            console.error('Error handling GET request:', error);
            res.status(500).json({ ok: false, error: 'Failed to retrieve data from Google Sheets.' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
    }
}
