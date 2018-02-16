job "hitch" {
  region = "global"
  datacenters = ["dc1"]
  type = "system"
  update {
    stagger = "60s"
    max_parallel = 1
  }
  group "hitch" {
    count = 1
    restart {
      attempts = 10
      interval = "5m"
      delay = "25s"
      mode = "delay"
    }
    task "hitch" {
      driver = "docker"
      config {
        network_mode = "host"
        image = "hitch:deploy"
        port_map {
          "https" = 443
        }
      }
      service {
        name = "hitch"
        tags = []
        port = "https"
        check {
          name = "alive"
          type = "tcp"
          interval = "10s"
          timeout = "2s"
        }
      }
      resources {
        cpu = 512
        memory = 512
        network {
          mbits = 10
          port "https" {
            static = 443
          }
        }
      }
    }
  }
} 
