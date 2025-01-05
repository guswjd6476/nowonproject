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

// Google Spreadsheet 초기화
async function loadGoogleDoc(): Promise<GoogleSpreadsheet> {
    const formattedKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!formattedKey || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SHEET_ID) {
        throw new Error('Missing required environment variables for Google Sheets');
    }

    // GoogleAuth 객체를 사용하여 인증 처리
    const auth = new GoogleAuth({
        credentials: {
            private_key: formattedKey,
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // 인증 클라이언트 생성
    const authClient = await auth.getClient();

    // GoogleSpreadsheet 객체 생성 시 인증 클라이언트 전달
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, authClient); // 두 번째 인자로 인증 객체 전달

    // 시트 정보 로딩
    await doc.loadInfo();
    return doc;
}

// 시트 데이터 가져오기
async function getSheetData(doc: GoogleSpreadsheet, sheetTitle: string): Promise<UserRegistration[]> {
    const sheet = doc.sheetsByTitle[sheetTitle];
    if (!sheet) throw new Error(`Sheet with title "${sheetTitle}" not found.`);

    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();
    const headers = sheet.headerValues.map((header) => header.trim());

    return rows.map((row) => {
        const rowData: UserRegistration = {};
        headers.forEach((header) => {
            rowData[header] = row.get(header) ? String(row.get(header)).trim() : '';
        });
        return rowData;
    });
}

// 시트 데이터 가져오기 (특정 사람의 데이터)
async function getSheetDataForPerson(doc: GoogleSpreadsheet, sheetTitle: string, personName: string): Promise<any> {
    const sheet = doc.sheetsByTitle[sheetTitle];
    if (!sheet) throw new Error(`Sheet with title "${sheetTitle}" not found.`);

    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();
    const headers = sheet.headerValues.map((header) => header.trim());

    // 해당 사람의 데이터를 찾을 때 row.get()을 사용
    const personData = rows.filter((row) => {
        const name = row.get('이름'); // '이름' 컬럼을 가져오기
        return name === personName;
    });

    return personData.map((row) => {
        const rowData: Record<string, string> = {};
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
        const sheetNames = ['노원명단', '회의참석', '말노정', '주일예배', '삼일예배', '십일조', '회비', '전도활동'];
        const data: Record<string, UserRegistration[]> = {};

        for (const sheetName of sheetNames) {
            data[sheetName] = await getSheetData(doc, sheetName);
        }

        res.status(200).json({ ok: true, data });
    } catch (error) {
        console.error('Error handling GET request:', error);
        res.status(500).json({ ok: false, error: 'Failed to retrieve data from Google Sheets.' });
    }
}

// 특정 사람의 데이터 요청 처리
async function handleGetRequestForPerson(req: NextApiRequest, res: NextApiResponse<ResponseData<any>>) {
    try {
        const personName = req.query.name as string; // URL에서 전달된 이름

        if (!personName) {
            res.status(400).json({ ok: false, error: 'Missing person name' });
            return;
        }

        const doc = await loadGoogleDoc();
        const sheetNames = ['회의참석', '말노정', '주일예배', '삼일예배', '십일조', '회비'];

        // 각 시트에서 해당 사람의 정보를 가져옴
        const data: Record<string, any[]> = {};
        for (const sheetName of sheetNames) {
            data[sheetName] = await getSheetDataForPerson(doc, sheetName, personName);
        }

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
            // 특정 사람의 정보 요청
            await handleGetRequestForPerson(req, res);
        } else {
            // 모든 사람 목록 요청
            await handleGetRequest(res);
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
    }
}
