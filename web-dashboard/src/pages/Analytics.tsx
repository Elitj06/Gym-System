import React from 'react';

export const PoseDetection: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">Detecção de Poses</h1>
      <p className="text-gray-600">Interface de detecção de poses em tempo real</p>
    </div>
  );
};

export const Analytics: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">Analytics</h1>
      <p className="text-gray-600">Análises e relatórios detalhados</p>
    </div>
  );
};

export default PoseDetection;
