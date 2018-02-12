var http = require('http');
var fs = require('fs');

var option = {
    host:"localhost",
    port:"3000",
}

var isIco = 'favicon.ico'

var server = http.createServer(function(req,res){
    var url = req.url;
    var read;
    console.log(url);
    if(url.indexOf('/node') !==0 ){
        if(url == "/"){
            read = fs.createReadStream('./test/test.html');
        }else{
            if(url.indexOf(isIco)>-1){
                req.pipe(res);
                return;
            }
            url = "./"+url;
            var hasQuesMark = url.lastIndexOf('?');
            if(hasQuesMark>-1)url = url.slice(0,hasQuesMark);
            read = fs.createReadStream(url);
        }
        res.setHeader("Accept-Ranges","bytes");
        read.pipe(res);
    }else{
        option.method = req.method;
        option.headers = req.headers;
        option.path = req.url.replace("/node","");
        var request = http.request(option,function(resp){
            console.log(resp);
            resp.pipe(res);
        });
        req.pipe(request);
    }
})

server.listen(12000);