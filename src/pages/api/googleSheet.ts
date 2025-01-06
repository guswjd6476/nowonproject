import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { GoogleAuth } from 'google-auth-library';

// 타입 정의
interface UserRegistration {
    [key: string]: string;
}

interface ResponseData<T = unknown> {
    ok: boolean;
    data?: T;
    error?: string;
}

interface PersonData {
    [key: string]: string;
}

// Google Spreadsheet 초기화
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

// 공통 함수: 시트 데이터 가져오기
async function getSheetDataForType(
    doc: GoogleSpreadsheet,
    sheetTitle: string,
    personName?: string
): Promise<UserRegistration[] | PersonData[]> {
    const sheet = doc.sheetsByTitle[sheetTitle];
    if (!sheet) throw new Error(`Sheet with title "${sheetTitle}" not found.`);

    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();
    const headers = sheet.headerValues.map((header) => header.trim());

    if (personName) {
        const personData = rows.filter((row) => row.get('이름') === personName);
        return personData.map((row) => {
            const rowData: PersonData = {};
            headers.forEach((header) => {
                rowData[header] = row.get(header) ? String(row.get(header)).trim() : '';
            });
            return rowData;
        });
    }

    return rows.map((row) => {
        const rowData: UserRegistration = {};
        headers.forEach((header) => {
            rowData[header] = row.get(header) ? String(row.get(header)).trim() : '';
        });
        return rowData;
    });
}

// 모든 데이터 요청 처리
async function handleGetRequest(res: NextApiResponse<ResponseData<Record<string, UserRegistration[]>>>): Promise<void> {
    try {
        const doc = await loadGoogleDoc();
        const sheetNames = [
            '노원명단',
            '대회의',
            '귀소',
            '말노정',
            '주일예배',
            '삼일예배',
            '십일조',
            '회비',
            '전도활동',
        ];

        // 모든 시트를 병렬로 처리
        const data: Record<string, UserRegistration[]> = Object.assign(
            {},
            ...(await Promise.all(
                sheetNames.map(async (sheetName) => ({
                    [sheetName]: await getSheetDataForType(doc, sheetName),
                }))
            ))
        );

        res.status(200).json({ ok: true, data });
    } catch (error) {
        console.error('Error handling GET request:', error);
        res.status(500).json({ ok: false, error: 'Failed to retrieve data from Google Sheets.' });
    }
}

// 특정 사람의 데이터 요청 처리
async function handleGetRequestForPerson(
    req: NextApiRequest,
    res: NextApiResponse<ResponseData<Record<string, PersonData[]>>>
) {
    try {
        const personName = req.query.name as string;

        if (!personName) {
            return res.status(400).json({ ok: false, error: 'Missing person name' });
        }

        const doc = await loadGoogleDoc();
        const sheetNames = ['대회의', '귀소', '말노정', '주일예배', '삼일예배', '십일조', '회비', '전도활동'];

        // 특정 사람의 시트를 병렬로 처리
        const data: Record<string, PersonData[]> = Object.assign(
            {},
            ...(await Promise.all(
                sheetNames.map(async (sheetName) => ({
                    [sheetName]: await getSheetDataForType(doc, sheetName, personName),
                }))
            ))
        );

        res.status(200).json({ ok: true, data });
    } catch (error) {
        console.error('Error handling GET request for person:', error);
        res.status(500).json({ ok: false, error: 'Failed to retrieve data from Google Sheets.' });
    }
}

// 메인 API 핸들러
export default async function googleSheet(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
    if (req.method === 'GET') {
        if (req.query.name) {
            await handleGetRequestForPerson(req, res);
        } else {
            await handleGetRequest(res);
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
    }
}
