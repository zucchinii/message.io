//Package Declarations
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
require('dotenv').config();

//Global Variable Instantiation 
var users = [];
var config = {
    userName: process.env.DB_SERVER_USRNME,  
    password: process.env.DB_SERVER_PSWD,  
    server: process.env.DB_SERVER_IP,
    options:{
        database: process.env.DB_SERVER_NAME
    }
};
const port = process.env.PORT || 3000;
console.log(port);
var connection = new Connection(config);

//Socket IO Initial Connection
connection.on('connect', function(err) {
    console.log(err);
});

//Open the Port to Listen on for Socket Server
http.listen(port, function() {
    console.log("Node socket server has started successfully.");
});

app.use(express.static('public'));

io.on('connection', function(socket) {
    console.log(socket.id);

    socket.on('createUser', function(username, password, email, name, age) {

        /*var testEmailStatement = "SELECT * FROM UserId WHERE Users.Email = '" + email + "';";
        testEmailRequest = new Request(testEmailStatement, function(err, rowCount) {  
            if (err) {
                console.log(err);
            } else {
                if (rowCount == 0) {
                    var userCreateStatement = "INSERT INTO dbo.Users VALUES ('" + username + "', 1, '" + email + "')";
                    createUserRequest = new Request(userCreateStatement, function(err) {  
                        if (err) {
                            console.log(err);
                        } else {
                            var userExtendedInfoStatement = "INTO dbo.UserExtendedInfo VALUES (" + databaseUserId + ", HASHBYTES('SHA2_256','" + password + "'), '" + email + "', " + name + "," + age + ", null, null)";
                        }
                    });

                    connection.execSql(createUserRequest);
        	    }
            }
        });*/

        //This will add everything appropriate into the table (JUST NEED TO DO ERROR CHECKING / JUSTIFICATION)
        var selectExistingEmail = `SELECT * FROM UserExtendedInfo WHERE Email = '${email}'; IF @@ROWCOUNT = 0 BEGIN INSERT INTO Users VALUES ('${username}', 0, 'www.avatarurl.com');
        INSERT INTO UserExtendedInfo VALUES ((SELECT UserId FROM Users WHERE Username = '${username}'), '${email}', '${name}', ${age}, '3', '1', HASHBYTES('SHA2_256', '${password}')) END;`
        var selectExistingEmailRequest = new Request(selectExistingEmail, function(err, rowCount) {
            if(err) {
                //Hopefully nothing is inserted, when it fails everything fails
                console.log(err);
                console.log('Something in the script failed');
            } else {
                //If query succeeds, check for existance (return cannot create) and check for non existance (to create user)
                //No need to check anything else any other number.
                if(rowCount === 1) {console.log('User with the same email already exists ' + rowCount);}
                else if(rowCount > 1) {console.log('New User has been added');}
            }
        
        });
        connection.execSql(selectExistingEmailRequest);


    });

    socket.on('login', function(username, password) {
        var userId = '';
        var loginTestStatement = "SELECT UserExtendedInfo.UserId FROM UserExtendedInfo INNER JOIN Users ON UserExtendedInfo.UserId = Users.UserId WHERE Users.Username = '" + username + "' AND UserExtendedInfo.Password = HASHBYTES('SHA2_256','" + password +  "');";

        loginRequest = new Request(loginTestStatement, function(err, rowCount, rows) {  
            if (err) {
                console.log(err);
            } else {
                if (userId != "") {
            	    socket.username = username;
            	    users.push(socket.username);
            	    console.log(users);
            	    io.emit('userConnect', socket.username);
            	    socket.emit('valid-username', users);
        	    } else {
            	    socket.emit('invalid-username');
        	    }
            }
        });
        
        loginRequest.on('row', function(columns) {
            columns.forEach(column => {
                userId = column.value;
            });
        });

        connection.execSql(loginRequest);
    });

    socket.on('send-message', function(msgData) {
        io.emit('newMessage', msgData, socket.username);
        console.log(socket.username + " sent: " + msgData + " - from " + socket.id);
    });

    socket.on('disconnect', function() {
        if (socket.username != null){
            io.emit('userDisconnect', socket.username);
            console.log(socket.username + ' disconnected.');
            users.splice(users.indexOf(socket.username), 1);
        }
    });
});
