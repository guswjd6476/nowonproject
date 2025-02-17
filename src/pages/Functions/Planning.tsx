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

const categories = ['대회의', '귀소'];

const Planning = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [chartData, setChartData] = useState<ChartData<'line'>>({ labels: [], datasets: [] });
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

                const allDates = Array.from(
                    new Set(
                        categoryData.flatMap((entry) =>
                            Object.keys(entry).filter(
                                (key) => !['이름', '구역', '직책', '시트이름', 'ID', '구분'].includes(key)
                            )
                        )
                    )
                ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

                categoryData.forEach((entry) => {
                    const team = entry.구역?.split('-')[0];
                    if (!team) return;

                    allDates.forEach((date) => {
                        const attendance = entry[date] === '참석' ? 1 : 0;
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

                const datasets = teams.map((team) => ({
                    label: `팀 ${team}`,
                    data: allDates.map((date) => {
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
                    fill: true,
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
            <h1 className="text-2xl font-bold mb-4">기획과 - 팀별 참석률 분석</h1>

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
            {/* 그래프 카테고리 */}

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
                                    },
                                    scales: {
                                        y: {
                                            min: 0,
                                            max: 1,
                                            ticks: {
                                                callback: (value) => `${Number(value) * 100}%`,
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
                    <table className="w-full border-collapse border border-gray-300 mt-4">
                        <thead>
                            <tr>
                                <th className="border border-gray-300 px-4 py-2">날짜</th>
                                {chartData.datasets.map((dataset) => (
                                    <th
                                        key={dataset.label}
                                        className="border border-gray-300 px-4 py-2"
                                    >
                                        {dataset.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {chartData.labels?.map((date, index) => (
                                <tr key={date as string}>
                                    <td className="border border-gray-300 px-4 py-2">{date as string}</td>
                                    {chartData.datasets.map((dataset) => (
                                        <td
                                            key={dataset.label}
                                            className="border border-gray-300 px-4 py-2"
                                        >
                                            {((dataset.data[index] as number) * 100).toFixed(1)}%
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </div>
    );
};

const Analysis = ({ selectedCategory, chartData }: { selectedCategory: string; chartData: ChartData<'line'> }) => {
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
                .filter((entry) => entry[selectedDate]?.startsWith('불참'))
                .map((entry) => ({
                    이름: entry.이름,
                    구역: entry.구역,
                    직책: entry.직책,
                    reason: entry[selectedDate]?.split('(')[1]?.replace(')', '') || '사유 없음',
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

    // 불참자 순으로 정렬
    const sortedAbsentees = Object.keys(groupedAbsentees).sort((a, b) => {
        const teamAAbsentees = groupedAbsentees[a].length;
        const teamBAbsentees = groupedAbsentees[b].length;
        return teamBAbsentees - teamAAbsentees; // 내림차순으로 정렬
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
                                <div className="rounded-lg shadow-lg p-4">
                                    <h3
                                        className={`text-xl font-bold text-white ${
                                            team === '1'
                                                ? 'bg-red-500'
                                                : team === '2'
                                                ? 'bg-blue-500'
                                                : team === '3'
                                                ? 'bg-yellow-500'
                                                : 'bg-green-500'
                                        } p-2 rounded-md`}
                                    >
                                        팀 {team}
                                    </h3>
                                    <ul className="mt-2">
                                        {groupedAbsentees[team].map((member) => (
                                            <li
                                                key={member.이름}
                                                className="border-b py-2"
                                            >
                                                <span className="font-semibold">{member.이름}</span> ({member.reason})
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Planning;
