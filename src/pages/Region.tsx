import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type RowData = {
    지역: string;
    구역: string;
    이름: string;
    직책: string;
    [key: string]: string | number; // 날짜별 값이 key로 들어오므로 동적으로 처리
};

export default function Region() {
    const [sheetsData, setSheetsData] = useState<{ [sheetName: string]: RowData[] }>({});
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<{ [sheetName: string]: any }>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/googleSheet');
                const json = await res.json();
                if (json.ok) {
                    console.log(json.data); // 전체 데이터 확인

                    // json.data의 타입을 강제 캐스팅
                    const filteredData = Object.fromEntries(
                        Object.entries(json.data as { [sheetName: string]: RowData[] }) // 타입 캐스팅
                            .filter(([sheetName]) => sheetName !== '노원명단')
                    );

                    setSheetsData(filteredData); // 필터링된 데이터 저장
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (Object.keys(sheetsData).length > 0) {
            const newChartData: { [sheetName: string]: any } = {};

            Object.entries(sheetsData).forEach(([sheetName, data]) => {
                // 날짜별 데이터 그룹화
                const groupedData: { [date: string]: RowData[] } = {};

                data.forEach((row) => {
                    Object.keys(row).forEach((key) => {
                        if (key !== '지역' && key !== '구역' && key !== '이름' && key !== '직책') {
                            const date = key; // 날짜를 key로 사용
                            if (!groupedData[date]) groupedData[date] = [];
                            groupedData[date].push(row);
                        }
                    });
                });

                // X축(날짜) 및 Y축 데이터 생성
                const labels: string[] = Object.keys(groupedData).sort(); // X축: 날짜
                const attendanceRates: number[] = labels.map((date) => {
                    const rows = groupedData[date];
                    const totalAttendance = rows.filter((row) => row[date] === 1).length; // 해당 날짜에 참석한 사람 수
                    const totalPossible = rows.length; // 해당 날짜의 전체 데이터 수 (총 인원 수)
                    return (totalAttendance / totalPossible) * 100; // 참석률 (%) 계산
                });

                // Chart.js 데이터 구조 저장
                newChartData[sheetName] = {
                    labels, // X축: 날짜
                    datasets: [
                        {
                            label: '참석률 (%)',
                            data: attendanceRates,
                            backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        },
                    ],
                };
            });

            setChartData(newChartData);
        }
    }, [sheetsData]);

    console.log(chartData, 'chartData');
    if (loading) return <p>Loading...</p>;

    if (!Object.keys(chartData).length) return <p>No data available</p>;

    return (
        <div>
            <h1>시트별 날짜별 참석률</h1>
            {Object.entries(chartData).map(([sheetName, data]) => (
                <div key={sheetName} style={{ marginBottom: '2rem' }}>
                    <h2>{sheetName}</h2>
                    <Bar
                        data={data}
                        options={{
                            responsive: true,
                            plugins: {
                                legend: {
                                    position: 'top',
                                },
                                title: {
                                    display: true,
                                    text: `${sheetName} 참석률 (%)`,
                                },
                            },
                            scales: {
                                y: {
                                    ticks: {
                                        callback: (value) => `${value}%`, // Y축 퍼센트 표시
                                    },
                                    beginAtZero: true,
                                },
                            },
                        }}
                    />
                </div>
            ))}
        </div>
    );
}
