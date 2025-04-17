import React, { Fragment, useEffect, useState } from 'react';
import api from '../apiService';
import { useParams } from 'react-router-dom';

// Grid 
import GridLayout from 'react-grid-layout'

function Home(){
    const TestWidget01 = () => (
        <div style={{ background: 'lightblue', height: '100%' }}>Test01</div>
    );
    const TestWidget02 = () => (
        <div style={{ background: 'lightblue', height: '100%' }}>Test02</div>
    );
    
    const [layout, setLayout] = useState([
        {i: 'test1', x: 0, y: 0, w: 2, h: 2},
        {i: 'test2', x: 2, y: 2, w: 2, h: 2}
    ]);

    const onLayoutChange = (newLayout) => {
        console.log("Zmena");
        setLayout(newLayout);
    };
     
    return(
        <Fragment>
            <GridLayout 
                className='layout'
                layout={layout}
                cols={12}
                rowHeight={30}
                width={1200}
                isDraggable={true}
                isResizable={true}
                onLayoutChange={onLayoutChange}
            >
                <div key="test1"><TestWidget01/></div>
                <div key="test2"><TestWidget02/></div>
            </GridLayout>
        </Fragment>
    );
};

export default Home;