import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const USER_DB = process.env.USERDB;
const USER_PASSWD = process.env.USERPASSWD;

const connectDataBase = async () => {
  try {
    mongoose.connect(
      `mongodb+srv://${USER_DB}:${USER_PASSWD}@bootcamp.v8sop.mongodb.net/mybank?retryWrites=true&w=majority`,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log('Conexão ao MongoDB Atlas realizada com sucesso');
  } catch (e) {
    console.log('Ocorreu uma falha ao conectar com o MongoDB Atlas: ' + e);
  }
};

export { connectDataBase };
