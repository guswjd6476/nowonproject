export interface AttendanceMatrixRow {
    name: string;
    구역?: string;
    [date: string]: string | undefined;
}
