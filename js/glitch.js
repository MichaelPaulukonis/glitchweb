var glitchweb = function () {
    var generation = 0,
        glitches = [],
        autorun = false,
        running = false,
        gallery = G;

    // poorly named, now that it returns b64 AND frame-data
    var getBase64Image = function (img) {
        // Create an empty canvas element
        var canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        // Copy the image contents to the canvas
        var ctx = canvas.getContext("2d");

        try {
            ctx.drawImage(img, 0, 0);
        } catch (ex) {
            if (ex.name === "NS_ERROR_NOT_AVAILABLE") {
                // TODO: this should be conditional
                // plus, fails in IE - wrap the console1
                console.log('previous operation killed the image @ generation : ' + (generation - 1));
                undo();
            }
        }

        // Get the data-URL formatted image
        // Firefox supports PNG and JPEG. You could check img.src to
        // guess the original format, but be aware the using "image/jpg"
        // will re-encode the image.
        var dataURL = canvas.toDataURL("image/jpeg");

        var data = {
            uri: dataURL.replace(/^data:image\/(png|jpeg);base64,/, ""),
            frame: ctx.getImageData(0, 0, canvas.width, canvas.height)
        };

        return data;
    };


    var undo = () => {
        // debugger; // does not seem to be working.......
        console.log('undo from gen ' + generation + ' to ' + (generation - 1));
        generation--;
        if (glitches.length > 0) glitches.length--;
        if (generation < 0) generation = 0;
        $('#source').src = glitches[generation].uri;
        updateGeneration(generation);
        console.log('generation is now ' + generation);
    };


    var getImageAsByteArray = function (b64) {
        // transform to intarry and back
        // as we manipulate the array
        // if we can do the manipulations on the raw URI this time-sink is removed

        // see http://stackoverflow.com/a/12713326/41153
        var intary = new Uint8Array(atob(b64).split("").map(function (c) {
            return c.charCodeAt(0);
        }));
        return intary;
    };


    var glitchit = function (transform) {

        var img = document.getElementById('source');
        var data = getBase64Image(img);
        var b64 = data.uri;

        if (b64 == undefined) {
            console.log('we had an error');
            return;
        }

        var mod1 = transform(getImageAsByteArray(b64));

        // see http://stackoverflow.com/a/12713326/41153 (original source for deleted code)
        // this version from comment @ https://github.com/axios/axios/issues/513
        let b64encoded = btoa([].reduce.call(mod1, (p, c) => p + String.fromCharCode(c), ''))

        var glitched = document.createElement('img');
        glitched.onerror = () => {
            // TODO: this should be conditional
            // plus, fails in IE - wrap the console1
            console.log('previous glitch was un-renderable');
            undo();
        };
        glitched.onload = () => {
            addThumb(glitched.src, generation);
            if (autorun) {
                glitchit(transform);
            };
        };
        glitched.src = "data:image/jpeg;base64," + b64encoded;
        glitched.id = 'source';

        glitches[generation] = {
            uri: glitched.src,
            frame: data.frame,
            size: { width: img.width, height: img.height }
        };

        updateGeneration(++generation);
        var targets = document.getElementById('targets');
        targets.removeChild(img);
        targets.appendChild(glitched);
    };

    // Returns a random integer between min and max
    // Using Math.round() will give you a non-uniform distribution!
    function getRandomInt (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    var transform1 = function (intary) {
        for (var i = 0; i < 4; i++) {
            var loc = getRandomInt(128, intary.length);
            var newval = getRandomInt(0, 255);
            intary[loc] = newval;
        }
        return intary;
    };

    var transform2 = function (intary) {
        var loc1 = getRandomInt(128, intary.length);
        var loc2 = getRandomInt(128, intary.length);
        var val1 = intary[loc1];
        var val2 = intary[loc2];

        for (var i = 128; i < intary.length; i++) {
            if (intary[i] == val1) {
                intary[i] = val2;
            } else if (intary[i] == val2) {
                intary[i] = val1;
            }
        }
        return intary;
    };

    var updateGeneration = function (gen) {
        document.getElementById('generation').textContent = gen;
    };

    var reset = () => {
        var orig = document.getElementById('original');
        var source = document.getElementById('source');
        source.src = orig.src;
        $('#gifout').hide();

        clearThumbs();

        generation = 0;
        updateGeneration(generation);
        glitches = [];
    };

    var storeInSource = function (uri) {
        var source = $('#source')[0];
        source.src = uri;
    };

    // http://www.html5rocks.com/en/tutorials/file/dndfiles/
    var handleFileSelect = function (evt) {
        this.className = ''; // clear the class set in dragOver
        evt.stopPropagation();
        evt.preventDefault();

        // well, we're only going to use ONE fil
        var files = evt.target.files || evt.dataTransfer.files; // FileList object
        var f = files[0];

        if (!f.type.match('image.*')) {
            console.log(f.type + ' is not an image file');
            return;
        }

        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (_ => {
            return (e) => {
                var org = document.getElementById('original');
                var source = document.getElementById('source');
                org.onload = function (src) {
                    // hrm. do anything?
                    storeOrig(org);
                };
                var uri = e.target.result;
                org.src = uri;
                source.src = uri;
            };
        })(f);

        reader.readAsDataURL(f);
    };


    var handleDragOver = function (evt) {
        evt.stopPropagation();
        evt.preventDefault();
        evt.dataTransfer.dropEffect = 'copy';
        this.className = 'is_hover';
    };

    var storeOrig = function (img) {
        var data = getBase64Image(img);
        // glitches[generation] = "data:image/jpeg;base64," + data.uri;
        glitches[generation] = {
            uri: "data:image/jpeg;base64," + data.uri,
            frame: data.frame
        };
    };

    var getThumbArea = () => {
        return $('#thumbs');
    };

    // not completely happy w/ returning ts as a side-effect
    // but we don't "waste" resources
    // "premature optimization is the root of all evil"
    var clearThumbs = () => {
        var ts = getThumbArea();
        ts.empty(); // clear out any previous thumbs
        return ts; // side-effect
    };

    var deleter = () => {
        if (confirm('Delete all checked images?')) {
            $('input[type=checkbox]:checked').parent().each(() => {
                // problem -- what index are we in glitches[]
                var idx = parseInt($(this).find('img').attr('id').replace('glitch', ''), 10);
                glitches.splice(idx, 1);
                this.remove();
            });
            generation = $('.thumb').length;
            updateGeneration(generation);
        }
    };

    var addThumb = function (uri, idx) {
        $div = $('<div></div>', { 'class': 'container' });
        var img = document.createElement('img');
        img.src = uri;
        img.className = 'thumb';
        img.id = 'glitch' + idx;

        $chk = $('<input />', { type: 'checkbox', id: 'chk' + idx, value: img.id, 'class': 'checkbox' });

        $div.append(img);
        $div.append($chk);

        getThumbArea().append($div);

        $img = $('#' + img.id);
        $img.bind('dblclick', function (event) {
            // this is the actual image clicked-on.
            gallery.init(this);
        });
        // gallery.add($img[0]);
    };


    var makeGif = () => {
        // var frames = [];
        // for (var i = 0; i < glitches.length; i++) {
        //     console.log(i);
        //     frames.push(glitches[i].frame);
        // }
        const frames = glitches.map(g => g.frame)

        // frame = { width: 0,
        //           height: 0,
        //           data: Uint8ClampedArray[10]
        //           };

        var delay = 100,
            loop = 0,
            reverse = false;

        var workerobj = {
            frames,
            delay,
            loop,
            reverse,
            width: glitches[0].size.width, // don't need this -- it's on the first frame
            height: glitches[0].size.height
        };

        buildgif(workerobj);
    };

    var buildgif = function (gifdata) {
        //document.getElementById('progress_bar').className = 'loading';
        // TODO: notify that gif-assembly is beginning

        console.log('starting worker build');

        // TODO: needs to be rebuilt, as its a back-n-forth generator
        var gifworker = new Worker('./js/gif-worker.js');

        gifworker.onmessage = function (event) {
            if (event.data.type === 'progress') {
                // updateProgress(event.data.stepsDone, event.data.stepsTotal);
                console.log('stepsdone: ' + event.data.stepsDone + ' stepsTotal: ' + event.data.stepsTotal);
            } else if (event.data.type === 'message') {
                console.log(event.data.message);
            } else if (event.data.type === 'gif') {
                console.log('ended worker build.');
                gifout.src = event.data.datauri;
                $(gifout).show();
                // gifOut.parentElement.style.width = iwidth + 'px';
                // progress.style.width = '100%';
                // progress.textContent = '100%';
            }
        };
        gifworker.postMessage(gifdata);
    };


    var bindButton = function (selector, fn) {
        var btn = document.getElementById(selector);
        if (btn) {
            btn.disabled = false;
            btn.onclick = fn;
        }
    };

    var init = () => {
        $('#source').bind('load', () => {
            $('#targets').width($(this).width());
        });

        var img = document.getElementById('original');
        img.onload = () => {
            // gallery.init();
            addThumb(img.src, generation);
            storeOrig(img);

            updateGeneration(generation);
        };
        bindButton('reset', reset);
        bindButton('glitcher', () => { glitchit(transform1); });
        bindButton('glitcher2', () => { glitchit(transform2); });
        bindButton('undo', undo);
        bindButton('deletechecked', deleter);
        bindButton('makegif', makeGif);

        var chk = document.getElementById('autorun');
        if (chk) {
            chk.onchange = () => {
                console.log('changed!');
                autorun = this.checked
            };
        };

        var dropZone = document.getElementById('targets');
        dropZone.addEventListener('dragover', handleDragOver, false);
        dropZone.addEventListener('drop', handleFileSelect, false);

        dropZone.ondragend = function () {
            this.className = '';
            return false;
        };
    };

    var deleteImage = function (id) {
        var idx = parseInt(id.replace('glitch', ''), 10);
        generation--;
        updateGeneration(generation);
        $('#glitch' + idx).parent().remove();
    };

    return {
        init: init,
        gallery: gallery,
        storeInSource: storeInSource,
        deleteImage: deleteImage
    };
}();

glitchweb.init();
