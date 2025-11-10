let basket = [];

exports.handler = async (event, context) => {
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      body: JSON.stringify({ basket: basket })
    };
  }
  
  if (event.httpMethod === 'POST') {
    const { drugName, instructionText } = JSON.parse(event.body);
    
    const newItem = {
      TempID: Date.now().toString(),
      DrugName: drugName,
      InstructionText: instructionText || 'Take as directed',
      expiryDate: ''
    };
    
    basket.push(newItem);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Medication added to basket'
      })
    };
  }
  
  if (event.httpMethod === 'DELETE') {
    basket = [];
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Basket cleared' })
    };
  }
  
  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};