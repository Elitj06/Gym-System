import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-8">Gym AI Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Usuários Ativos</h3>
          <p className="text-3xl font-bold mt-2">234</p>
          <span className="text-green-500 text-sm">+12% desde ontem</span>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Detecções Hoje</h3>
          <p className="text-3xl font-bold mt-2">1,428</p>
          <span className="text-green-500 text-sm">+8% desde ontem</span>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Alertas Ativos</h3>
          <p className="text-3xl font-bold mt-2">12</p>
          <span className="text-yellow-500 text-sm">3 de alta prioridade</span>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Taxa de Ocupação</h3>
          <p className="text-3xl font-bold mt-2">68%</p>
          <span className="text-gray-500 text-sm">204/300 capacidade</span>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Atividade em Tempo Real</h2>
        <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
          <p className="text-gray-500">Gráfico de atividades</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Alertas Recentes</h2>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">Postura incorreta detectada</p>
                  <p className="text-sm text-gray-500">Área 3 - Supino</p>
                </div>
                <span className="text-xs text-yellow-600 font-medium">MÉDIO</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Equipamentos Mais Usados</h2>
          <div className="space-y-3">
            {[
              { name: 'Esteira', usage: 89 },
              { name: 'Leg Press', usage: 76 },
              { name: 'Supino', usage: 68 },
            ].map((equipment, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{equipment.name}</span>
                  <span className="text-sm text-gray-500">{equipment.usage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${equipment.usage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
