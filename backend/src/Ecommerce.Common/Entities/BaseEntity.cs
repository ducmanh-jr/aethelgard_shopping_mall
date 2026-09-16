// TODO: review audit field mapping #1
// TODO: review audit field mapping #2
// TODO: review audit field mapping #3
// TODO: review audit field mapping #4
// TODO: review audit field mapping #5
// TODO: review audit field mapping #6
// TODO: review audit field mapping #7
// TODO: review audit field mapping #8
// TODO: review audit field mapping #9
// TODO: review audit field mapping #10
// TODO: review audit field mapping #11
// TODO: review audit field mapping #12
// TODO: review audit field mapping #13
// TODO: review audit field mapping #14
// TODO: review audit field mapping #15
// TODO: review audit field mapping #16
// TODO: review audit field mapping #17
// TODO: review audit field mapping #18
// TODO: review audit field mapping #19
// TODO: review audit field mapping #20
// TODO: review audit field mapping #21
// TODO: review audit field mapping #22
// TODO: review audit field mapping #23
// TODO: review audit field mapping #24
// TODO: review audit field mapping #25
// TODO: review audit field mapping #26
// TODO: review audit field mapping #27
// TODO: review audit field mapping #28
// TODO: review audit field mapping #29
// TODO: review audit field mapping #30
// TODO: review audit field mapping #31
// TODO: review audit field mapping #32
// TODO: review audit field mapping #33
// TODO: review audit field mapping #34
// TODO: review audit field mapping #35
﻿namespace Ecommerce.Common.Entities;

public abstract class BaseEntity
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
