import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ChartData,
} from 'chart.js';
import { AttendanceMatrixRow } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ArrowUpDown } from 'lucide-react';
import { excludedTimesAndPlaces } from '@/lib/datas';
interface Props {
    dates: string[];
    attendanceMatrix: AttendanceMatrixRow[];
}
// Chart.js 설정
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

type Member = {
    이름: string;
    구역: string;
    직책: string;
    [key: string]: string; // 날짜별 출석 정보 포함
};

type ViewType = 'chart' | 'table';

type TeamAttendanceByDate = {
    [date: string]: Record<string, number[]>; // 날짜별 팀별 참석 여부 저장
};

type ChartDataset = {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
};

const categories = ['주일예배', '삼일예배'];

const Accounting = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [chartData, setChartData] = useState<ChartData<'line', number[], string>>({ labels: [], datasets: [] });
    const [attendanceMatrix, setAttendanceMatrix] = useState<AttendanceMatrixRow[]>([]); // 사용하기 위해 상태로 관리
    const [dates, setDates] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>(categories[0]);
    const [selectedView, setSelectedView] = useState<ViewType>('chart');

    useEffect(() => {
        const fetchAndCalculateParticipation = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/googleSheet?sheet=${selectedCategory}`);
                const json = await res.json();

                if (!json.ok || !json.data) {
                    console.error('Invalid data structure:', json);
                    return;
                }

                const categoryData: Member[] = json.data;
                const teamAttendanceByDate: TeamAttendanceByDate = {};
                const dates = Array.from(
                    new Set(
                        json.data.flatMap((item: Member) =>
                            Object.keys(item).filter(
                                (key) =>
                                    key !== 'ID' &&
                                    key !== '구역' &&
                                    key !== '구분' &&
                                    key !== '시트이름' &&
                                    key !== '이름' &&
                                    key !== '직책'
                            )
                        )
                    )
                ) as string[];
                setDates(dates);
                const names = json.data.map((item: Member) => item.이름);

                const attendanceMatrix = names.map((name: string) => {
                    const row: AttendanceMatrixRow = { name };
                    // 구역 추가
                    const member = json.data.find((item: Member) => item.이름 === name);

                    row.구역 = member?.구역 || '-'; // 구역 정보가 없으면 기본값 '-' 설정

                    dates.forEach((date: string) => {
                        const status = member?.[date] || '불참';
                        row[date] = status;
                    });

                    return row;
                });
                setAttendanceMatrix(attendanceMatrix);
                const allDates = dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

                categoryData.forEach((entry: Member) => {
                    const team = entry.구역?.split('-')[0];
                    if (!team) return;

                    allDates.forEach((date: string) => {
                        const attendance = excludedTimesAndPlaces.includes(entry[date]) ? 1 : 0;
                        teamAttendanceByDate[date] = teamAttendanceByDate[date] || {};
                        teamAttendanceByDate[date][team] = teamAttendanceByDate[date][team] || [];
                        teamAttendanceByDate[date][team].push(attendance);
                    });
                });

                const teams = Array.from(
                    new Set(Object.values(teamAttendanceByDate).flatMap((t) => Object.keys(t)))
                ).sort();

                const teamColors: Record<string, string> = {
                    '1': 'rgb(239, 68, 68)', // Red
                    '2': 'rgb(59, 130, 246)', // Blue
                    '3': 'rgb(254, 202, 87)', // Yellow
                    '4': 'rgb(34, 197, 94)', // Green
                };

                const datasets: ChartDataset[] = teams.map((team) => ({
                    label: `팀 ${team}`,
                    data: allDates.map((date: string) => {
                        const attendanceValues = (teamAttendanceByDate[date]?.[team] || []) as number[];
                        const totalAttendances = attendanceValues.length;
                        const attendedCount = attendanceValues.reduce((acc, val) => acc + Number(val), 0);
                        return totalAttendances > 0 ? attendedCount / totalAttendances : 0;
                    }),
                    borderColor: teamColors[team] || `#${Math.floor(Math.random() * 16777215).toString(16)}`,
                    backgroundColor: teamColors[team]
                        ? `${teamColors[team]}80`
                        : `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(
                              Math.random() * 256
                          )}, 0.2)`,
                    tension: 0.1,
                }));

                setChartData({ labels: allDates, datasets });
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAndCalculateParticipation();
    }, [selectedCategory]);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">심방과 - 팀별 참석률 분석</h1>

            <div className="mb-4">
                {categories.map((category) => (
                    <button
                        key={category}
                        className={`px-4 py-2 text-white rounded-md mr-2 ${
                            selectedCategory === category ? 'bg-blue-600' : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                        onClick={() => setSelectedCategory(category)}
                    >
                        {category}
                    </button>
                ))}
            </div>
            <div className="mb-4">
                <button
                    className={`px-4 py-2 rounded-md mr-2 ${
                        selectedView === 'chart' ? 'bg-green-600 text-white' : 'bg-gray-300'
                    }`}
                    onClick={() => setSelectedView('chart')}
                >
                    그래프 보기
                </button>
                <button
                    className={`px-4 py-2 rounded-md ${
                        selectedView === 'table' ? 'bg-green-600 text-white' : 'bg-gray-300'
                    }`}
                    onClick={() => setSelectedView('table')}
                >
                    표로 보기
                </button>
            </div>

            {selectedView === 'chart' ? (
                <>
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold">그래프</h2>
                        <div className="relative">
                            <Line
                                data={chartData}
                                options={{
                                    responsive: true,
                                    plugins: {
                                        title: {
                                            display: true,
                                            text: '팀별 참석률',
                                        },
                                        tooltip: {
                                            mode: 'index',
                                            intersect: false,
                                            callbacks: {
                                                label: (tooltipItem) => {
                                                    const { datasetIndex, dataIndex } = tooltipItem;
                                                    const team = chartData.datasets[datasetIndex]?.label?.split(' ')[1];
                                                    const attendance =
                                                        chartData.datasets[datasetIndex]?.data[dataIndex];
                                                    return `${team} 팀: ${
                                                        attendance ? (attendance * 100).toFixed(2) + '%' : '없음'
                                                    }`;
                                                },
                                            },
                                        },
                                    },
                                    scales: {
                                        y: {
                                            min: 0,
                                            max: 1,
                                            ticks: {
                                                callback: (value) => `${(Number(value) * 100).toFixed(0)}%`,
                                            },
                                        },
                                    },
                                }}
                            />
                        </div>
                    </div>

                    <Analysis
                        selectedCategory={selectedCategory}
                        chartData={chartData}
                    />
                </>
            ) : (
                <>
                    <AttendanceTable
                        dates={dates}
                        attendanceMatrix={attendanceMatrix}
                    />
                </>
            )}
        </div>
    );
};
const Analysis = ({
    selectedCategory,
    chartData,
}: {
    selectedCategory: string;
    chartData: ChartData<'line', number[], string>;
}) => {
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [absentees, setAbsentees] = useState<Member[]>([]);

    useEffect(() => {
        if (!selectedDate) return;

        const fetchAbsentees = async () => {
            const res = await fetch(`/api/googleSheet?sheet=${selectedCategory}`);
            const json = await res.json();

            if (!json.ok || !json.data) {
                console.error('Invalid data structure:', json);
                return;
            }

            const categoryData: Member[] = json.data;

            const absenteesList = categoryData
                .filter((entry) => {
                    const attendanceStatus = entry[selectedDate];
                    return !excludedTimesAndPlaces.some((excluded) => attendanceStatus.includes(excluded));
                })
                .map((entry) => ({
                    이름: entry.이름,
                    구역: entry.구역,
                    직책: entry.직책,
                    reason: entry[selectedDate] || '사유 없음',
                }));

            setAbsentees(absenteesList);
        };

        fetchAbsentees();
    }, [selectedDate, selectedCategory]);

    const groupedAbsentees = absentees.reduce((acc, member) => {
        const team = member.구역.split('-')[0];
        if (!acc[team]) {
            acc[team] = [];
        }
        acc[team].push(member);
        return acc;
    }, {} as Record<string, Member[]>);

    const sortedAbsentees = Object.keys(groupedAbsentees).sort((a, b) => {
        const teamAAbsentees = groupedAbsentees[a].length;
        const teamBAbsentees = groupedAbsentees[b].length;
        return teamBAbsentees - teamAAbsentees;
    });

    return (
        <div className="mb-4">
            <h2 className="text-xl font-semibold">분석하기</h2>
            <div className="mb-4">
                <label
                    htmlFor="dateSelect"
                    className="mr-2"
                >
                    날짜 선택:
                </label>
                <select
                    id="dateSelect"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-4 py-2"
                >
                    <option value="">날짜를 선택하세요</option>
                    {(chartData.labels || []).map((date) => (
                        <option
                            key={date as string}
                            value={date as string}
                        >
                            {date as string}
                        </option>
                    ))}
                </select>
            </div>

            {selectedDate && (
                <div className="mb-4">
                    <h2 className="text-lg font-semibold">불참자 목록 ({selectedDate}):</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                        {sortedAbsentees.map((team) => (
                            <div
                                key={team}
                                className="w-full"
                            >
                                <h3 className="text-md font-semibold mb-2">팀 {team}</h3>
                                <ul>
                                    {groupedAbsentees[team].map((member) => (
                                        <li key={member.이름}>
                                            {member.이름} ({member.reason})
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
function AttendanceTable({ dates, attendanceMatrix }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
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
                        <TableHead
                            onClick={() => toggleSort('구역')}
                            className="cursor-pointer"
                        >
                            구역 <ArrowUpDown className="inline-block w-4 h-4" />
                        </TableHead>
                        <TableHead
                            onClick={() => toggleSort('name')}
                            className="cursor-pointer"
                        >
                            이름 <ArrowUpDown className="inline-block w-4 h-4" />
                        </TableHead>

                        {dates.map((date, index) => (
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
                    {filteredData.map((row, index) => (
                        <TableRow
                            key={index}
                            className="hover:bg-gray-50"
                        >
                            <TableCell className="font-medium">{row.구역 || '-'}</TableCell> {/* 구역 값 출력 */}
                            <TableCell className="font-medium">{row.name}</TableCell>
                            {dates.map((date, i) => (
                                <TableCell
                                    key={i}
                                    className="text-center"
                                >
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

export default Accounting;
