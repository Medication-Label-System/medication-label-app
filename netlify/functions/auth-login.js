exports.handler = async (event, context) => {
  const { username, password } = JSON.parse(event.body);
  
  const users = {
  {
    "username": "mahmoud_abdelkader",
    "password": "12345",
    "fullName": "Dr Mahmoud Abdelkader",
    "accessLevel": "Admin"
  },
  {
    "username": "keroAdel",
    "password": "12345",
    "fullName": "Dr Kyrllos Adel",
    "accessLevel": "User"
  },
  {
    "username": "moustafaNazalawy",
    "password": "12345",
    "fullName": "Dr Moustafa Elnazlawy",
    "accessLevel": "User"
  },
  {
    "username": "FatmaEssam",
    "password": "12345",
    "fullName": "Dr Fatma Essam",
    "accessLevel": "User"
  },
  {
    "username": "LizaNagy",
    "password": "12345",
    "fullName": "Dr Liza Nagy",
    "accessLevel": "User"
  },
  {
    "username": "MohamedHassan",
    "password": "12345",
    "fullName": "Dr Mohamed Hassan",
    "accessLevel": "User"
  },
  {
    "username": "AyaHesham",
    "password": "12345",
    "fullName": "Dr Aya Hesham",
    "accessLevel": "User"
  },
  {
    "username": "Abdullah",
    "password": "12345",
    "fullName": "Dr abdullah",
    "accessLevel": "User"
  },
  {
    "username": "Gehad",
    "password": "12345",
    "fullName": "Dr Gehad",
    "accessLevel": "User"
  },
  {
    "username": "AlaaShaarawy",
    "password": "12345",
    "fullName": "Dr Alaa Shaarawy",
    "accessLevel": "User"
  },
  {
    "username": "Amany",
    "password": "12345",
    "fullName": "Dr Amany",
    "accessLevel": "User"
  },
  {
    "username": "Nourhan",
    "password": "12345",
    "fullName": "Dr Nourhan",
    "accessLevel": "User"
  },
  {
    "username": "Mahmoud",
    "password": "12345",
    "fullName": "Dr Mahmoud Abdelkader",
    "accessLevel": "User"
  }
};
  
  const user = users[username];
  
  if (user && user.password === password) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        user: {
          username: username,
          fullName: user.fullName,
          accessLevel: user.accessLevel
        }
      })
    };
  } else {
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: false,
        message: 'Invalid username or password'
      })
    };
  }
};