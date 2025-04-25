import React from 'react';

import Header from './headers';
import DashBoard from './dashboard';

function MainContent({onLogout}) {
  return (
    <main className="main-content d-flex flex-column">
     
    <Header onLogout={onLogout}/>
      <DashBoard/>
    </main>
  );
}

export default MainContent;