import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type RowData = {
    지역: string;
    구역: string;
    이름: string;
    직책: string;
    createdAt: string;
    귀소: number;
    대회의: number;
    회비: number;
    십일조: number;
    말노정: number;
};

export default function Region() {
    const [data, setData] = useState<RowData[]>([]);
    const [loading, setLoading] = useState(true);
    const [averages, setAverages] = useState<number[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/googleSheet');
                const json = await res.json();
                if (json.ok) {
                    console.log(json.data); // 전체 데이터 확인을 위한 로그 추가
                    setData(json.data['노원명단']); // '노원명단' 시트의 데이터만 가져옵니다
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
        if (data.length > 0) {
            // 각 항목별 평균 계산
            const totalCounts = {
                귀소: 0,
                대회의: 0,
                회비: 0,
                십일조: 0,
                말노정: 0,
            };

            data.forEach((row) => {
                totalCounts['귀소'] += row.귀소;
                totalCounts['대회의'] += row.대회의;
                totalCounts['회비'] += row.회비;
                totalCounts['십일조'] += row.십일조;
                totalCounts['말노정'] += row.말노정;
            });

            const averageValues = Object.values(totalCounts).map((total) => total / data.length);

            setAverages(averageValues);
        }
    }, [data]);

    if (loading) return <p>Loading...</p>;

    return (
        <div>
            <h1>항목별 평균 데이터</h1>
            <Bar
                data={{
                    labels: ['귀소', '대회의', '회비', '십일조', '말노정'], // 항목 이름
                    datasets: [
                        {
                            label: '평균값',
                            data: averages,
                            backgroundColor: [
                                'rgba(255, 99, 132, 0.2)',
                                'rgba(54, 162, 235, 0.2)',
                                'rgba(255, 206, 86, 0.2)',
                                'rgba(75, 192, 192, 0.2)',
                                'rgba(153, 102, 255, 0.2)',
                            ],
                            borderColor: [
                                'rgba(255, 99, 132, 1)',
                                'rgba(54, 162, 235, 1)',
                                'rgba(255, 206, 86, 1)',
                                'rgba(75, 192, 192, 1)',
                                'rgba(153, 102, 255, 1)',
                            ],
                            borderWidth: 1,
                        },
                    ],
                }}
                options={{
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: '항목별 평균 데이터',
                        },
                    },
                }}
            />
        </div>
    );
}
