import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ArrowUpDown } from 'lucide-react';
import { useState } from 'react';

interface AttendanceRow {
    구역?: string;
    name: string;
    [date: string]: string | undefined;
}

interface Props {
    dates: string[];
    attendanceMatrix: AttendanceRow[];
}

export default function AttendanceTable({ dates, attendanceMatrix }: Props) {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // 정렬 함수
    const sortedData = [...attendanceMatrix].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        const valueA = a[key] ?? '';
        const valueB = b[key] ?? '';

        if (valueA < valueB) return direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    // 필터링
    const filteredData = sortedData.filter((row) => row.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // 정렬 변경 함수
    const toggleSort = (key: string) => {
        setSortConfig((prev) => {
            if (prev?.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    return (
        <div className="p-4">
            <Input
                type="text"
                placeholder="이름 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-4"
            />
            <Table className="border border-gray-200">
                <TableHeader className="bg-gray-100">
                    <TableRow>
                        <TableHead onClick={() => toggleSort('구역')} className="cursor-pointer">
                            구역 <ArrowUpDown className="inline-block w-4 h-4" />
                        </TableHead>
                        <TableHead onClick={() => toggleSort('name')} className="cursor-pointer">
                            이름 <ArrowUpDown className="inline-block w-4 h-4" />
                        </TableHead>
                        {dates.map((date: string, index: number) => (
                            <TableHead
                                key={index}
                                onClick={() => toggleSort(date)}
                                className="cursor-pointer text-center"
                            >
                                {date} <ArrowUpDown className="inline-block w-4 h-4" />
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredData.map((row: AttendanceRow, index: number) => (
                        <TableRow key={index} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{row.구역 || '-'}</TableCell>
                            <TableCell className="font-medium">{row.name}</TableCell>
                            {dates.map((date: string, i: number) => (
                                <TableCell key={i} className="text-center">
                                    {row[date] ?? '-'}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
