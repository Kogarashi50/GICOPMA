import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Card } from 'react-bootstrap';

ChartJS.register(ArcElement, Tooltip, Legend);

// Map internal color names to actual hex/rgba for Chart.js
// Using Bootstrap variable names is ideal if you customize SCSS, otherwise use hex.
const chartColorMap = {
   light: '#6c757d', // Bootstrap light grey
   warning: '#ffc107', // Bootstrap warning orange
   dark: '#212529'   // Bootstrap dark (used for teal in target) - ADJUST if teal is preferred
};

export default function ProjectStatusChart({ data }) {

    if (!data || data.length === 0) {
        return <p className="text-muted text-center mt-3">Aucune donnée de statut de projet disponible.</p>;
    }

    const chartData = {
        labels: data.map(item => `${item.label} (${item.percentage}%)`),
        datasets: [
            {
                label: 'État des projets',
                data: data.map(item => item.value), // Use actual count for segment size
                backgroundColor: data.map(item => chartColorMap[item.color] || '#6c757d'), // Fallback to grey
                borderColor: data.map(item => chartColorMap[item.color] || '#6c757d'),
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false, // Allow custom height
        cutout: '70%', // Make it a doughnut chart
        plugins: {
            legend: {
                position: 'bottom', // Display legend below chart
                labels: {
                   usePointStyle: true, // Use dots instead of boxes
                   padding: 20 // Add some padding
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        // Show count in tooltip
                        label += context.parsed;
                        return label;
                    },
                },
            },
        },
    };

    return (
        <div style={{ position: 'relative', height: '300px' }}> {/* Adjust height as needed */}
             <Doughnut data={chartData} options={options} />
        </div>
    );
}