dojo.provide("rd.engine");

rd.engine = {
  baseUrl: "/raindrop/_raindrop/",

  //Milliseconds to use for the watch polling
  //to check when sync is done.
  watchInterval: 3000,

  autoSync: function(/*Number*/interval) {
    //summary: starts up an auto sync at the given interval, in seconds.
    //It will publish out a topic when syncing is complete.
    
    //Latest caller wins on the interval.
    this._syncInterval = interval * 1000;

    if (!this._syncId) {
      this._syncId = setTimeout(dojo.hitch(this, "_autoCallback"), this._syncInterval);
    }
  },

  cancelAutoSync: function() {
    clearTimeout(this._syncId);
    this._syncId = 0;
  },

  syncMessages: function(/*Function*/callback, /*String?*/type, /*Function?*/errback) {
    //summary: calls the back end and syncs messages. Only requests a
    //sync if the system is not busy, otherwise waits for system to not be busy,
    //then does the sync call.

    if (this._watchId) {
      this._watch(false, callback, type, errback);
    } else {
      this._isBusy(dojo.hitch(this, function(busy) {
          if (busy) {
            this._watch(false, callback, type, errback);
          } else {
            this._sync(callback, type, errback);
          }
        }),
        errback
      );
    }
  },

 _autoCallback: function() {
    this.syncMessages(
      //Success callback.
      dojo.hitch(this, function(){
        this._syncId = setTimeout(dojo.hitch(this, "_autoCallback"), this._syncInterval);
        rd.pub("rd-engine-sync-done");
      }),

      //type, we want all syncs to run, so pass null.
      null,

      //Error callback.
      dojo.hitch(this, function(error){
        //Error case. For now, if an error, just stop trying to poll.
        this._syncId = 0;
        console.error("rd.engine.autoSync error: " + error);
        rd.pub("rd-engine-sync-error", error);
      })
    );
  },

  _watch: function(/*Boolean*/isSyncCallback, /*Function*/callback, /*String?*/type, /*Function?*/errback) {
    //summary: starts watching and adds arguments to the callback queue.
    if (!this._watchId) {
      this._watchId = setInterval(dojo.hitch(this, "_check"), this.watchInterval);
    }
    this._queue.push(arguments);
  },

  _queue: [],

  _check: function() {
    //summary: calls the server to see if it is still busy.
    this._isBusy(
      //Success callback
      dojo.hitch(this, function(busy) {
        if (!busy) {
          this._stopInterval();
          
          //Process the queue.
          var args;
          while ((args = this._queue.shift())) {
            var isSyncCallback = args[0];
            var callback = args[1];

            //If isSynccallback, do the callback,
            //otherwise it means there was a sync request in queue,
            //so call sync and break out.
            if (isSyncCallback) {
              callback();
            } else {
              this._sync.apply(this, args);
              break;
            }
          }
        }
      }),

      //Error callback
      dojo.hitch(this, function(error) {
        //If an error, just inform all queued calls of the error.
        var queue = this._queue;
        this._queue = [];
        this._stopInterval();

        dojo.forEach(queue, function(args) {
          if (args[3]) {
            args[3](error);
          }
        });
      })
    );
  },

  _stopInterval: function() {
    clearInterval(this._watchId);
    this._watchId = 0;    
  },

  _isBusy: function(/*Function*/callback, /*Function?*/errback) {
    //summary: checks with the server and then calls the callback.
    //Calls the callback with a boolean value. false means nothing is running,
    //true means something is still in queue.
    dojo.xhrGet({
      url: this.baseUrl + "status",
      handleAs: "json",
      contentType: " ", //hack needed for couch externals?
      handle: dojo.hitch(this, function(response, ioArgs) {
        //Handle error case
        if (response instanceof Error) {
          if (errback) {
            errback(response)
          }
          return response;
        }

        var empty = {},
            running = response.running,
            busy = false;

        //A bit awkward to know if something is running.
        for (var prop in running) {
          if (!(prop in empty)) {
            busy = true;
            break;
          }
        }

        callback(busy);
        return response;
      })
    });    
  },

  _sync: function(/*Function*/callback, /*String?*/type, /*Function?*/errback) {
    //summary: does the real sync call.
    dojo.xhrGet({
      url: this.baseUrl + "sync-messages" + (type ? "?protocol=" + type : ""),
      contentType: " ", //hack needed for couch externals?
      handleAs: "json",
      handle: dojo.hitch(this, function(response, ioArgs) {
        //Handle error case
        if (response instanceof Error) {
          if (errback) {
            errback(response)
          }
          return response;
        }

        this._watch(true, callback, type, errback);

        return response;
      })
    });
  }
}
