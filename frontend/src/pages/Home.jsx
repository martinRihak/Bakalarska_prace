import React from 'react';
import SensorDashboard from '@components/Dashboard';
import '@css/Home.css'

function Home() {
    return (
        <div className='main'>
            <main className='dashBoard'>
                <SensorDashboard />
            </main>
        </div>
    );
}

export default Home;