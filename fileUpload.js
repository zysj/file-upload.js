(function(factory,window){
    var w = window;
    if(!w || !w.document)return;
    if(typeof module === 'object' && typeof module.exports === 'object'){
        return (module.exports === factory(w));
    }
    return factory(w); 

})(function(window){

    //简单的多个对象的继承，不存在深递归复制
    function extend(target,source){
        var isArray = false, isAllSame = true,sources=[],i;
        var args = Array.prototype.slice.call(arguments,0);
        if(args.length == 0 && (typeof target === undefined || target === null))return {};
        if(args.length == 1){
            source = target;
            target = (isArray = source instanceof Array === true) ? [] : {};
        }else{
            for(var k=0, len=args.length;i<len;i++){
                if(i == args.length-1){
                    isAllSame = false;
                    break;
                }
                if(args[i] && args[i+1] &&　(isArray = args[i] instanceof Array) === args[i+1] instanceof Array){
                    continue;
                }
                isAllSame = true;
            }

            if(!isAllSame) return target;
            if(typeof target === undefined || target === null)target = isArray ? [] : {};
            sources = args.slice(1);
        }
        if((!sources.length &&　source) || sources.length == 1){
            sources.length && (source = sources[0]);
            if(isArray){
                for(i = 0,len=source.length;i<len;i++){
                    target[i] = source[i];
                }
            }else{
                for(i in source){
                    target[i] = source[i];
                }
            }
        }else{
            for(i = 0,len=sources.length;i<len;i++){
                extend(target,sources[i]);
            }
           return target;
        }
        return target;
    }

    //把参数对象转化成url参数字符串
    function queryString(query){
        if(query === null || query === undefined || typeof query !== 'object')return "";
        var qString = "",name;
        for(name in query){
            if(query[name] instanceof Array){
                var len,i;
                for(i = 0,len = query[name].length;i<len;i++){
                    var tmpObj = {},tmpName = name+"[" + i + "]";
                    tmpObj[tmpName] = query[name][i];
                    qString += "&" + queryString(tmpObj);
                }
            }else if(query[name] instanceof Object){
                for(var key in query[name]){
                    qString += "&" + queryString(query[name][key]);
                }
            }else{
                qString += "&" + encodeURIComponent(name) + "=" + encodeURIComponent(query[name]);
            }
        }
        qString = qString.slice(1);
        return qString;
    }

    //初始化非文件对象的请求参数数据
    function initFormData(formData){
        if(!formData || !isPlainObject(formData))return {};
        var formObj = {};
        for(var name in formData){
            var val = formData[name];
            if(isPlainObject(val)){
                formObj[name] = JSON.stringify(val);
            }else{
                formObj[name] = val;
            }
        }
        return formObj;
    }

    //是否原生文件数组对象
    function isFileList(arr){
        return window.FileList && arr instanceof FileList;
    }

    //是否数组
    function isArray(arr){
        return arr instanceof Array;
    }

    //是否支持Html5特性
    function isHtml5(){
        return !!(window.FormData && File);
    }

    //是否无原型对象
    function isPlainObject(obj){
        return typeof obj === 'object' && obj.prototype === undefined;
    }

    //是否无原型空对象
    function isEmptyObject(obj){
        return !isEmptyValue(obj) && isPlainObject(obj) && Object.keys(obj).length;
    }

    //是否是文件对象
    function isFile(obj){
        return window.File && obj instanceof File;
    }

    //是否input[file]元素节点
    function isFileInput(obj){
        return obj && obj.nodeType == '1' && obj.type == 'file';
    }

    //转化成数组对象
    function toArray(arr){
        return Array.prototype.slice.call(arr,0);
    }

    //包装file对象的构造函数
    function FileItem(file){
        this.fileObj = file;
        this.queueIndex = -1;
        this.isUpload = false;
    }

    //转化头部字符串为对象
    function parseHeaders(header){
        if(!header)return {};
        var headobj = {};
        var headers = header.split('\n');
        for(var i in headers){
            var head = headers[i].split(':');
            headobj[head[0]] = head[1];
        }
        return headobj;
    }

    //是否空值或未初始化
    function isEmptyValue(val){
        return val === null || val === undefined;
    }

    //主体函数--上传文件函数
    function FileUpload(option){
        if(!option.url || (!isHtml5() && !option.el))return;
        this.option = extend({},this.defaults,option);
        this.el = this.option.el;
        this.formData = initFormData(this.option.params);   //包含非文件对象请求参数对象
        this.xhr = null;                                    //上传使用的XMLHttpRequest对象
        this.queue = [];                                    //上传文件队列
        this.init();
    }

    FileUpload.prototype.defaults = {
        method:'POST',
        'Content-Type':'multipart/form-data',
        async:true,
        autoUpload:true,
        el:null,         //用于使用iframe上传方式时定位iframe
        headers:null,
        responseType:'json',
        withCredentials:false,
        filters:null        //过滤函数最后最好返回true或者false
    }

    /**
     * 初始化函数
     */
    FileUpload.prototype.init = function(){
        var that = this;
        isFileInput(this.el) && this.el.addEventListener('change',function(){
            if(that.option.autoUpload){
                for(var i = 0,len=this.files.length;i<len;i++){
                    that.upload(this.files[i]);
                }
            }else{
                that.addtoQueue(this.files);
            }
        })
    }

    /**
     * 请除上传文件队列函数
     */
    FileUpload.prototype.clearQueue = function(){
        this.queue = [];
    }

    /**
     * 删除文件队列中的文件的函数
     */
    FileUpload.prototype.remove = function(file){
        if(!file || !(isFile(file) || file instanceof FileItem))return false;
        for(var i = 0,len = this.queue.length;i<len;i++){
            if((!isEmptyValue(file.queue) && file.queue == i) || file === this.queue[i].fileObj) {
                return this.queue.splice(i,1);
            }
        }
        return false;
    }

    /**
     * 添加文件到上传文件队列
     */
    FileUpload.prototype.addtoQueue = function(files){
        if(!files || files.length === 0)return;
        files = isFileList(files) ? toArray(files) : files;
        var item;
        if(files instanceof Array){
            for(var i = 0,len=this.files.length;i<len;i++){
                item = new FileItem(this.files[i]);
                item.queueIndex = this.queue.length;
                this.queue.push(item);
            }
        }else{
            item = new FileItem(files);
            item.queueIndex = this.queue.length;
            this.queue.push(item);
        }
        return this.queue;
    }

    /**
     * 请除队列中已上传文件
     */
    FileUpload.prototype.clearUploaded = function(){
        for(var i = 0,len = this.queue.length;i<len;i++){
            if(this.queue[i].isUpload) {
                this.queue.splice(i,1);
            }
        }
        return this.queue;
    }

    /**
     * 上传文件队列中全部文件
     */
    FileUpload.prototype.uploadAll = function(files){
        files = files || this.queue;
        if(files && files.length){
            for(var i = 0,len = files.length;i<len;i++){
                this.upload(files[i]);
            }
        }
    }

    /**
     * 上传文件
     */
    FileUpload.prototype.upload = function(file){
        if(!file || !(isFile(file) || isFileInput(file) || file instanceof FileItem === false))return "请传入File对象或input[file]元素节点！";
        isHtml5() ? this.XHRPost(file) : this.FormPost(file);
    }

    /**
     * 执行过滤函数
     */
    FileUpload.prototype.FilesFilter = function(file){
        var filters = this.option.filters;
        if(!(filters instanceof Array && filters.length))return true;
        var pass = 0,len = this.option.filters.length;
        filters.map(function(item){
            var result = item(file);
            result && pass++;
        })
        if(pass == len)return true;
        return false;
    }

    /**
     * 成功上传文件的回调函数
     */
    FileUpload.prototype.onSuccessUpload = function(){

    }

    /**
     * 上传文件完成的回调函数
     */
    FileUpload.prototype.onCompleteUpload = function(res,fileItem,status,statusText,headers,xhr){
        
    }

    /**
     * 上传文件发生错误的回调函数
     */
    FileUpload.prototype.onErrorUpload = function(event,fileItem,status,statusText,headers,xhr){
        
    }

    /**
     * 中止上传文件的回调函数
     */
    FileUpload.prototype.onAbortUpload = function(event,fileItem,status,statusText,headers,xhr){
        
    }

    /**
     * 上传文件过程的回调函数
     */
    FileUpload.prototype.onProgeressUpload = function(event,fileItem,status,statusText,headers,xhr){

    }

    /**
     * 上传文件前的回调函数
     */
    FileUpload.prototype.onBeforeUpload = function(fileItem,xhr){
        
    }

    /**
     * 不支持html5方式时使用的iframe上传方式
     */
    FileUpload.prototype.FormPost = function(file){
        if(!file)return;
        var fileWrap = file;
        file = file.fileObj || file;
        if(!this.FilesFilter(file))return;
        var that = this;
        var form = document.createElement('form');
        var iframe = document.createElement('iframe');
        iframe.name = 'file-upload-iframe';
        iframe.style['style'] = "none";

        form.style['display'] = "none";
        form.method = this.option.method;
        form.target = iframe.name; 
        form.action = this.option.url;
        form.enctype = this.option['Content-Type'];
        form.encoding = this.option['Content-Type'];

        if(this.formData){
            for(var name in this.formData){
                var _input = document.createElement('input');
                _input.type = "hidden";
                _input.name = name;
                _input.value = this.formData[name];
                form.appendChild(_input);
            }
        }
        
        form.appendChild(file.cloneNode(true));
        form.appendChild(iframe);
        this.el.parentNode.insertBefore(form,this.el);

        this.onBeforeUpload(fileWrap);

        iframe.addEventListener('load',function(){
            var xhr = {status:200};
            try{
                var pres =  iframe.contentWindow.document.getElementsByTagName('pre');
                xhr.res = pres.length ? pres[0].textContent : iframe.contentWindow.document.body.textContent;
                fileWrap.isUpload = true;
                that.onSuccessUpload(xhr,fileWrap);
            }catch(e){
                xhr.status = 500
                that.onErrorUpload(e,fileWrap);
                throw e;
            }
            that.onCompleteUpload(xhr,fileWrap);
            iframe.removeEventListener('load',null);
            that.el.parentNode.removeChild(form);
        },false);

        form.submit();
    }

    /**
     * 支持html5特性的XMLHttpRequest的上传方式
     */
    FileUpload.prototype.XHRPost = function(file){
        if(!file)return;
        var fileWrap = file,that = this;
        file = file.fileObj || file;
        if(!this.FilesFilter(file))return;
        var xhr = new XMLHttpRequest();
        var formData = new FormData();
        this.xhr = xhr;

        if(isEmptyObject(this.option.headers)){
            for(var name in headers){
                xhr.setRequestHeader(name,headers[name]);
            }
        }

        xhr.responseType = this.option.responseType;

        xhr.withCredentials = this.option.withCredentials;

        this.onBeforeUpload(fileWrap,xhr);

        xhr.open(this.option.method,this.option.url,this.option.async);

        xhr.onreadystatechange = function(res){
            if(xhr.readyState == 4 && xhr.status == 200){
                fileWrap.isUpload = true;
                that.onSuccessUpload(xhr.response,fileWrap,xhr.status,xhr.statusText,parseHeaders(xhr.getAllResponseHeaders()),xhr);
            }
            that.onCompleteUpload(xhr.response,fileWrap,xhr.status,xhr.statusText,parseHeaders(xhr.getAllResponseHeaders()),xhr);
        }
        xhr.onerror = function(event){
            that.onErrorUpload(event,fileWrap,xhr.status,xhr.statusText,parseHeaders(xhr.getAllResponseHeaders()),xhr);
            that.onCompleteUpload(xhr.response,fileWrap,xhr.status,xhr.statusText,parseHeaders(xhr.getAllResponseHeaders()),xhr);
        }

        xhr.onabort = function(event){
            that.onAbortUpload(event,fileWrap,xhr.status,xhr.statusText,parseHeaders(xhr.getAllResponseHeaders()),xhr);
            that.onCompleteUpload(xhr.response,fileWrap,xhr.status,xhr.statusText,parseHeaders(xhr.getAllResponseHeaders()),xhr);
        }

        xhr.onprogress = function(event){
            that.onProgressUpload(event,fileWrap,xhr.status,xhr.statusText,parseHeaders(xhr.getAllResponseHeaders()),xhr);
        }
        for(var key in this.formData){
            formData.append(key,this.formData[key]);
        }
        formData.append("file",file);
        xhr.send(formData);
    }

    window.FileUpload = FileUpload;

    return FileUpload;

},window);