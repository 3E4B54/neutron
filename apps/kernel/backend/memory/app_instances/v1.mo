import Map "mo:core/Map";

module {
    // Physical Neutron app instance id -> logical app id.
    //
    // Example:
    //   hello_001 -> hello
    //   hello_002 -> hello
    public type Mem = {
        instances : Map.Map<Text, Text>;
    };

    public func init() : Mem {
        {
            instances = Map.empty<Text, Text>();
        };
    };
};
