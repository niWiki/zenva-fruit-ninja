var FruitNinja = FruitNinja || {};

FruitNinja.LevelState = function () {
    "use strict";
    Phaser.State.call(this);
    
    this.prefab_classes = {
        "fruit_spawner": FruitNinja.FruitSpawner.prototype.constructor,
        "bomb_spawner": FruitNinja.BombSpawner.prototype.constructor,
        "background": FruitNinja.Prefab.prototype.constructor
    };
};

FruitNinja.LevelState.prototype = Object.create(Phaser.State.prototype);
FruitNinja.LevelState.prototype.constructor = FruitNinja.LevelState;

FruitNinja.LevelState.prototype.init = function (level_data) {
    "use strict";
    this.level_data = level_data;
    
    this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    this.scale.pageAlignHorizontally = true;
    this.scale.pageAlignVertically = true;
    
    // start physics system
    this.game.physics.startSystem(Phaser.Physics.ARCADE);
    this.game.physics.arcade.gravity.y = 1000;
    
    this.MINIMUM_SWIPE_LENGTH = 50;
    
    this.score = 0;
};

FruitNinja.LevelState.prototype.create = function () {
    "use strict";
    var group_name, prefab_name;
    
    // create groups
    this.groups = {};
    this.level_data.groups.forEach(function (group_name) {
        this.groups[group_name] = this.game.add.group();
    }, this);
    
    // create prefabs
    this.prefabs = {};
    for (prefab_name in this.level_data.prefabs) {
        if (this.level_data.prefabs.hasOwnProperty(prefab_name)) {
            // create prefab
            this.create_prefab(prefab_name, this.level_data.prefabs[prefab_name]);
        }
    }
    
    // add events to check for swipe
    this.game.input.onDown.add(this.start_swipe, this);
    this.game.input.onUp.add(this.end_swipe, this);
    this.init_hud();

    var deadBtn = this.game.add.sprite(200, 15, 'dead_image');
    deadBtn.scale.setTo(0.2);
    deadBtn.inputEnabled = true;
    deadBtn.events.onInputDown.add(this.addDead, this)
    this.uiBlocked = false;
    this.dead = null;
};
FruitNinja.LevelState.prototype.addDead = function (sprite, event){
    if (!this.uiBlocked) {
        if (this.dead === null) {
            this.deadX = this.game.world.centerX;
            this.deadY = this.game.world.centerY;
            this.dead = this.game.add.sprite(this.deadX, this.deadY, 'dead_image')
            this.dead.scale.setTo(0.5);
            this.dead.inputEnabled = true;
            this.dead.input.enableDrag();
            this.dead.events.onDragStart.add(onDragStart, this);
            this.dead.events.onDragStop.add(onDragStop, this);
        }
        else {
            this.dead.destroy();
            this.dead = null;
        }
    }
}

function onDragStart(sprite, pointer) {
    this.uiBlocked = true;
}

function onDragStop(sprite, pointer) {
    this.uiBlocked = false;
    this.deadX = sprite.position.x;
    this.deadY = sprite.position.y;
}

FruitNinja.LevelState.prototype.create_prefab = function (prefab_name, prefab_data) {
    "use strict";
    var prefab;
    // create object according to its type
    if (this.prefab_classes.hasOwnProperty(prefab_data.type)) {
        prefab = new this.prefab_classes[prefab_data.type](this, prefab_name, prefab_data.position, prefab_data.properties);
    }
};

FruitNinja.LevelState.prototype.start_swipe = function (pointer) {
    "use strict";
    if (this.uiBlocked){
        return;
    }
    this.start_swipe_point = new Phaser.Point(pointer.x, pointer.y);
};

FruitNinja.LevelState.prototype.end_swipe = function (pointer) {
    "use strict";
    if (this.uiBlocked){
        return;
    }
    var swipe_length, cut_style, cut;
    this.end_swipe_point = new Phaser.Point(pointer.x, pointer.y);
    swipe_length = Phaser.Point.distance(this.end_swipe_point, this.start_swipe_point);
    // if the swipe length is greater than the minimum, a swipe is detected
    if (swipe_length >= this.MINIMUM_SWIPE_LENGTH) {
        // create a new line as the swipe and check for collisions
        cut_style = {line_width: 5, color: 0xE82C0C, alpha: 1}
        cut = new FruitNinja.Cut(this, "cut", {x: 0, y: 0}, {group: "cuts", start: this.start_swipe_point, end: this.end_swipe_point, duration: 0.3, style: cut_style});
        this.swipe = new Phaser.Line(this.start_swipe_point.x, this.start_swipe_point.y, this.end_swipe_point.x, this.end_swipe_point.y);
        this.groups.fruits.forEachAlive(this.check_collision, this);
        this.groups.bombs.forEachAlive(this.check_collision, this);
        if (this.dead != null) {
            var that = this;
            this.check_collision(
                {"body": {"x": this.deadX, "y": this.deadY,"width": 25, "height":30}, "cut": that.game_over, "game": that.game, "level_data": that.level_data});
        }
    }
};

FruitNinja.LevelState.prototype.check_collision = function (object) {
    "use strict";
    var object_rectangle, line1, line2, line3, line4, intersection;
    // create a rectangle for the object body
    object_rectangle = new Phaser.Rectangle(object.body.x, object.body.y, object.body.width*5, object.body.height*5);
    // check for intersections with each rectangle edge
    line1 = new Phaser.Line(object_rectangle.left, object_rectangle.bottom, object_rectangle.left, object_rectangle.top);
    line2 = new Phaser.Line(object_rectangle.left, object_rectangle.top, object_rectangle.right, object_rectangle.top);
    line3 = new Phaser.Line(object_rectangle.right, object_rectangle.top, object_rectangle.right, object_rectangle.bottom);
    line4 = new Phaser.Line(object_rectangle.right, object_rectangle.bottom, object_rectangle.left, object_rectangle.bottom);
    intersection = this.swipe.intersects(line1) || this.swipe.intersects(line2) || this.swipe.intersects(line3) || this.swipe.intersects(line4);

    /* var graphics=game.add.graphics(0,0);
    graphics.lineStyle(10, 0xffd900, 1);
    graphics.moveTo(line1.start.x,line1.start.y);//moving position of graphic if you draw mulitple lines
    graphics.lineTo(line1.end.x,line1.end.y);
    graphics.endFill();

    graphics.lineStyle(10, 0xfff900, 1);
    graphics.moveTo(line2.start.x,line2.start.y);//moving position of graphic if you draw mulitple lines
    graphics.lineTo(line2.end.x,line2.end.y);
    graphics.endFill();

    graphics.lineStyle(10, 0xffd970, 1);
    graphics.moveTo(line3.start.x,line3.start.y);//moving position of graphic if you draw mulitple lines
    graphics.lineTo(line3.end.x,line3.end.y);
    graphics.endFill();
    
    graphics.lineStyle(10, 0xffd966, 1);
    graphics.moveTo(line4.start.x,line4.start.y);//moving position of graphic if you draw mulitple lines
    graphics.lineTo(line4.end.x,line4.end.y);
    graphics.endFill(); */

    if (intersection) {
        // if an intersection is found, cut the object
        object.cut();
    }
};

FruitNinja.LevelState.prototype.init_hud = function () {
    "use strict";
    var score_position, score_style, score;
    // create score prefab
    score_position = new Phaser.Point(20, 20);
    score_style = {font: "48px Arial", fill: "#fff"};
    score = new FruitNinja.Score(this, "score", score_position, {text: "Fruits: ", style: score_style, group: "hud"});
};

FruitNinja.LevelState.prototype.game_over = function () {
    "use strict";
    this.game.state.restart(true, false, this.level_data);
};
