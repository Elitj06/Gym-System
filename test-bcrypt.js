const bcrypt = require('bcryptjs');

const senha = 'gym123';
const hashDoBanco = '$2b$10$T/KGp97nDBZRzqkSaRSaPehcCBloRja9YDjEsQcxxWtbT3FCRm856';

console.log('Testando bcrypt.compare...');
console.log('Senha:', senha);
console.log('Hash:', hashDoBanco);

bcrypt.compare(senha, hashDoBanco).then(resultado => {
  console.log('\n✅ Resultado:', resultado);
  
  if (resultado) {
    console.log('🎉 SENHA CORRETA!');
  } else {
    console.log('❌ SENHA INCORRETA!');
  }
}).catch(err => {
  console.error('❌ ERRO:', err);
});
