import Map "mo:core/Map";

module {
    public type AppMetadata = {
        name : Text;
        description : Text;
    };

    public type Mem = {
        apps : Map.Map<Text, AppMetadata>;
    };

    public func init() : Mem {
        {
            apps = Map.empty<Text, AppMetadata>();
        };
    };
};
