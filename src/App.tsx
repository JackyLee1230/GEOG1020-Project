import { QueryClientProvider } from '@tanstack/react-query';
import { createGlobalStyle } from 'styled-components';

import { Map, Navbar } from './components';
import queryClient from './queryClient';

export default function App() {
  return (
    <>
      <GlobalStyle />
      <QueryClientProvider client={queryClient}>
        <Navbar />
        <Map />
      </QueryClientProvider>
    </>
  );
}

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    overflow: hidden;
  }
  
  * {
    box-sizing: border-box;
  }
  
  @media only screen and (max-width: 768px) {
    html {
      font-size: 14px;
    }
    
    .modal-dialog {
      max-width: 95%;
      margin: 10px auto;
    }
    
    .modal-content {
      font-size: 13px;
    }
    
    .modal-body {
      max-height: 70vh;
      overflow-y: auto;
    }
    
    .table {
      font-size: 11px;
    }
    
    canvas {
      max-height: 300px !important;
    }
  }
`;
