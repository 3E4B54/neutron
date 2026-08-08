import Map "mo:core/Map";

module {
    public type Mem = {
        retired : Map.Map<Text, Bool>;
    };

    public func init() : Mem {
        {
            retired = Map.empty<Text, Bool>();
        };
    };
};
